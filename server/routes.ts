import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { 
  insertAircraftRegistrySchema, 
  insertTokenOfferingSchema, 
  insertTokenHolderSchema, 
  insertTokenTransactionSchema 
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES, ALL_PERMISSIONS } from "../shared/permissions";
import { registerBlockchainKeyManagementRoutes } from "./routes/blockchain-key-management";
import legacyDataTransferRoutes from "./routes/legacy-data-transfer";
import adaptiveComplianceRoutes from "./routes/adaptive-compliance";
import { registerAdvancedKeyRecoveryRoutes } from "./routes/advanced-key-recovery";
import multiPlatformIntegrationRoutes from "./routes/multi-platform-integration";
import auditGenerationRoutes from "./routes/audit-generation";
import complianceAlertsRoutes from "./routes/compliance-alerts";
import { registerCryptoSubscriptionRoutes } from "./routes/crypto-subscriptions";
import documentGenerationRoutes from "./routes/document-generation";
import maintenanceRoutes from "./routes/maintenance";
import digitalFormsRoutes from "./routes/digital-forms";
import mlTrainingRoutes from "./routes/ml-training";
import documentsRoutes from "./routes/documents";
import cryptoSigningRoutes from "./routes/crypto-signing";
import { signTrainingRecord, getOrgActiveKey } from "./services/crypto-signing";
import { queueAuditReadinessRefresh } from "./services/audit-readiness";
import { evaluateAction, authorityRank, isValidAuthority } from "./services/gate-engine";
import reviewerRoutes from "./routes/reviewer";
import governanceRoutes from "./routes/governance";
import agentsRoutes from "./routes/agents";
import federalContractsRoutes from "./routes/federal-contracts";
import { generateDocumentImportTutorial } from "./generate-document-import-tutorial";
import { auditComplianceAI } from "./services/audit-compliance-ai";
import { db } from "./db";
import { resolveTenant, isMultiTenant, isPlatformStaff, getUserMemberships, getDefaultOrgId, invalidateMembershipCache, invalidateDefaultOrgCache, requireOrg } from "./middleware/tenant";
import { users, trainingOrganizations, auditLogs, faaPolicyDocuments } from "@shared/schema";
import { count, eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sql as drizzleSql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Tenant context — resolves the active organization for every request
  app.use(resolveTenant);

  // ── Tenant Session Endpoints ─────────────────────────────────────────────
  // Current tenant context: active org, deployment mode, user's memberships
  app.get('/api/session/tenant', isAuthenticated, async (req: any, res) => {
    try {
      const memberships = await getUserMemberships(req.user.id);
      res.json({
        multiTenant: isMultiTenant(),
        activeOrganizationId: req.orgId ?? null,
        isPlatformStaff: isPlatformStaff(req.user?.email),
        organizations: memberships,
      });
    } catch (error) {
      console.error('Tenant session error:', error);
      res.status(500).json({ message: 'Failed to load tenant context' });
    }
  });

  // Switch the active organization for this session
  app.post('/api/session/active-org', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationId } = req.body;
      if (!organizationId || typeof organizationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
        return res.status(400).json({ message: 'A valid organizationId is required' });
      }
      const staff = isPlatformStaff(req.user?.email);
      if (!staff) {
        const memberships = await getUserMemberships(req.user.id);
        if (!memberships.some((m) => m.organizationId === organizationId)) {
          return res.status(403).json({ message: 'You are not a member of that organization' });
        }
      } else {
        const [org] = await db.select().from(trainingOrganizations).where(eq(trainingOrganizations.id, organizationId));
        if (!org || org.isActive === false) return res.status(404).json({ message: 'Organization not found or inactive' });
      }
      req.session.activeOrgId = organizationId;
      // Staff cross-tenant switches are audited (stamped to the org being entered).
      if (staff) {
        await storage.createAuditLog({
          userId: req.user?.id || 'system',
          eventType: 'staff_org_switch',
          message: `Platform staff ${req.user?.email} switched active organization`,
          details: { organizationId, previousOrganizationId: req.orgId ?? null },
          severity: 'info',
          organizationId,
        } as any).catch((err: any) => console.error('Staff org switch audit log failed (non-fatal):', err));
      }
      res.json({ success: true, activeOrganizationId: organizationId });
    } catch (error) {
      console.error('Active org switch error:', error);
      res.status(500).json({ message: 'Failed to switch organization' });
    }
  });

  // Test route
  app.get("/api/test", (req, res) => {
    res.json({ message: "Aircraft Registry & Tokenization Platform", timestamp: new Date().toISOString() });
  });

  // ── Public Config ────────────────────────────────────────────────────────
  // Lets the (pre-auth) client know the deployment mode so it can show or
  // hide multi-tenant chrome like the self-serve signup link.
  app.get('/api/config', (_req, res) => {
    res.json({ multiTenant: isMultiTenant() });
  });

  // ── Self-Serve Organization Signup (multi-tenant mode only) ─────────────
  // Creates the organization, its first admin account, the admin's membership,
  // and a 30-day Trial license in one transaction, then generates the org's
  // Ed25519 signing key and logs the new admin in on a fresh session.
  const signupAttempts = new Map<string, { count: number; resetAt: number }>();
  function signupRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = signupAttempts.get(ip);
    if (!entry || entry.resetAt < now) {
      signupAttempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
      return false;
    }
    entry.count += 1;
    return entry.count > 10;
  }

  const signupSchema = z.object({
    organizationName: z.string().trim().min(2, 'Organization name is required').max(200),
    organizationType: z.enum(['part_142', 'part_141', 'part_121', 'part_135', 'mro', 'atc']),
    regulatoryAuthority: z.enum(['faa', 'easa', 'transport_canada', 'casa']),
    certificateNumber: z.string().trim().max(100).optional(),
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    email: z.string().trim().email('A valid email is required').max(255),
    password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  });

  app.post('/api/signup', async (req: any, res) => {
    // In single-workspace mode this endpoint does not exist.
    if (!isMultiTenant()) return res.status(404).json({ message: 'Not found' });
    try {
      if (signupRateLimited(req.ip || 'unknown')) {
        return res.status(429).json({ message: 'Too many signup attempts. Please try again later.' });
      }
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? 'Invalid signup data', errors: parsed.error.errors });
      }
      const data = parsed.data;
      const email = data.email.toLowerCase();
      if (isPlatformStaff(email)) {
        return res.status(403).json({ message: 'This email domain is reserved for BCCS staff' });
      }
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });
      }

      const passwordHash = await bcrypt.hash(data.password, 12);
      const masterPublicKey = `BCCS-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

      let user: any, org: any;
      try {
        const result = await db.transaction(async (tx) => {
          const [newUser] = await tx.insert(users).values({
            email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: 'admin',
            isActive: true,
            passwordHash,
          }).returning();
          const [newOrg] = await tx.insert(trainingOrganizations).values({
            organizationName: data.organizationName,
            organizationType: data.organizationType,
            regulatoryAuthority: data.regulatoryAuthority,
            certificateNumber: data.certificateNumber || null,
            masterPublicKey,
            contactInfo: { email },
            isActive: true,
          }).returning();
          await tx.execute(drizzleSql`
            INSERT INTO user_organizations (user_id, organization_id, org_role)
            VALUES (${newUser.id}, ${newOrg.id}::uuid, 'admin')
          `);
          await tx.execute(drizzleSql`
            INSERT INTO bccs_licenses
              (organization_id, plan, status, seats_limit, current_period_start, current_period_end, assigned_by, notes, updated_at)
            VALUES
              (${newOrg.id}::uuid, 'trial', 'trial', 5, NOW(), NOW() + INTERVAL '30 days', 'self-serve signup', 'Self-serve trial — awaiting plan assignment', NOW())
          `);
          return { user: newUser, org: newOrg };
        });
        user = result.user;
        org = result.org;
      } catch (txErr: any) {
        if (txErr?.code === '23505') {
          return res.status(409).json({ message: 'An account with this email already exists. Try signing in instead.' });
        }
        throw txErr;
      }

      invalidateDefaultOrgCache();
      invalidateMembershipCache(user.id);
      const { invalidateLicenseCache } = await import('./middleware/license');
      invalidateLicenseCache();

      // Generate the organization's Ed25519 signing key (non-fatal — can be
      // regenerated later from Organization Setup).
      try {
        const { generateAndStoreOrgKeyPair } = await import('./services/crypto-signing');
        await generateAndStoreOrgKeyPair(org.id);
      } catch (keyErr) {
        console.error('Signup key generation failed (non-fatal):', keyErr);
      }

      await storage.createAuditLog({
        userId: user.id,
        eventType: 'org_signup',
        message: `Self-serve signup: ${data.organizationName} (${email})`,
        details: { organizationId: org.id, organizationName: data.organizationName },
        severity: 'info',
        organizationId: org.id,
      } as any).catch((err: any) => console.error('Signup audit log failed (non-fatal):', err));

      // Fresh session for the new admin (avoids session fixation), then login.
      req.session.regenerate((regenErr: any) => {
        if (regenErr) {
          console.error('Signup session regenerate error:', regenErr);
          return res.status(201).json({ success: true, requiresLogin: true, message: 'Account created — please sign in' });
        }
        req.logIn(user, (loginErr: any) => {
          if (loginErr) {
            console.error('Signup auto-login error:', loginErr);
            return res.status(201).json({ success: true, requiresLogin: true, message: 'Account created — please sign in' });
          }
          req.session.activeOrgId = org.id;
          const { passwordHash: _ph, ...safeUser } = user;
          res.status(201).json({ success: true, user: safeUser, organization: org });
        });
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Signup failed. Please try again.' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { passwordHash: _, ...safeUser } = user as any;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Registry Analytics
  app.get('/api/registry/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getRegistryStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching registry stats:", error);
      res.status(500).json({ message: "Failed to fetch registry stats" });
    }
  });

  // Aircraft Registry Routes
  app.get('/api/aircraft', isAuthenticated, async (req, res) => {
    try {
      const aircraft = await storage.getAllAircraft();
      res.json(aircraft);
    } catch (error) {
      console.error("Error fetching aircraft:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });

  app.get('/api/aircraft/:id', isAuthenticated, async (req, res) => {
    try {
      const aircraft = await storage.getAircraft(req.params.id);
      if (!aircraft) {
        return res.status(404).json({ message: "Aircraft not found" });
      }
      res.json(aircraft);
    } catch (error) {
      console.error("Error fetching aircraft:", error);
      res.status(500).json({ message: "Failed to fetch aircraft" });
    }
  });

  app.post('/api/aircraft', isAuthenticated, async (req, res) => {
    try {
      const aircraftData = insertAircraftRegistrySchema.parse(req.body);
      const aircraft = await storage.createAircraft(aircraftData);
      res.status(201).json(aircraft);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid aircraft data", errors: error.errors });
      }
      console.error("Error creating aircraft:", error);
      res.status(500).json({ message: "Failed to create aircraft" });
    }
  });

  app.put('/api/aircraft/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.updateAircraft(req.params.id, req.body);
      res.json({ message: "Aircraft updated successfully" });
    } catch (error) {
      console.error("Error updating aircraft:", error);
      res.status(500).json({ message: "Failed to update aircraft" });
    }
  });

  app.delete('/api/aircraft/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAircraft(req.params.id);
      res.json({ message: "Aircraft deleted successfully" });
    } catch (error) {
      console.error("Error deleting aircraft:", error);
      res.status(500).json({ message: "Failed to delete aircraft" });
    }
  });

  // Token Offering Routes
  app.get('/api/token-offerings', isAuthenticated, async (req, res) => {
    try {
      const offerings = await storage.getAllTokenOfferings();
      res.json(offerings);
    } catch (error) {
      console.error("Error fetching token offerings:", error);
      res.status(500).json({ message: "Failed to fetch token offerings" });
    }
  });

  app.get('/api/token-offerings/:id', isAuthenticated, async (req, res) => {
    try {
      const offering = await storage.getTokenOffering(req.params.id);
      if (!offering) {
        return res.status(404).json({ message: "Token offering not found" });
      }
      res.json(offering);
    } catch (error) {
      console.error("Error fetching token offering:", error);
      res.status(500).json({ message: "Failed to fetch token offering" });
    }
  });

  app.post('/api/token-offerings', isAuthenticated, async (req, res) => {
    try {
      const offeringData = insertTokenOfferingSchema.parse(req.body);
      const offering = await storage.createTokenOffering(offeringData);
      res.status(201).json(offering);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid token offering data", errors: error.errors });
      }
      console.error("Error creating token offering:", error);
      res.status(500).json({ message: "Failed to create token offering" });
    }
  });

  // Token Holder Routes
  app.get('/api/token-offerings/:id/holders', isAuthenticated, async (req, res) => {
    try {
      const holders = await storage.getTokenHoldersByOffering(req.params.id);
      res.json(holders);
    } catch (error) {
      console.error("Error fetching token holders:", error);
      res.status(500).json({ message: "Failed to fetch token holders" });
    }
  });

  app.post('/api/token-holdings', isAuthenticated, async (req, res) => {
    try {
      const holderData = insertTokenHolderSchema.parse(req.body);
      const holder = await storage.createTokenHolder(holderData);
      res.status(201).json(holder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid token holder data", errors: error.errors });
      }
      console.error("Error creating token holder:", error);
      res.status(500).json({ message: "Failed to create token holder" });
    }
  });

  // Token Transaction Routes
  app.get('/api/token-transactions', isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getAllTokenTransactions();
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  app.get('/api/token-offerings/:id/transactions', isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getTokenTransactionsByOffering(req.params.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching token transactions:", error);
      res.status(500).json({ message: "Failed to fetch token transactions" });
    }
  });

  app.post('/api/token-transactions', isAuthenticated, async (req, res) => {
    try {
      const transactionData = insertTokenTransactionSchema.parse(req.body);
      const transaction = await storage.createTokenTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      console.error("Error creating token transaction:", error);
      res.status(500).json({ message: "Failed to create token transaction" });
    }
  });

  // Compliance Routes
  app.get('/api/aircraft/:id/compliance', isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getComplianceChecksByAircraft(req.params.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching compliance checks:", error);
      res.status(500).json({ message: "Failed to fetch compliance checks" });
    }
  });

  app.post('/api/aircraft/:id/compliance/:checkType', isAuthenticated, async (req, res) => {
    try {
      const check = await storage.performComplianceCheck(req.params.id, req.params.checkType);
      res.status(201).json(check);
    } catch (error) {
      console.error("Error performing compliance check:", error);
      res.status(500).json({ message: "Failed to perform compliance check" });
    }
  });

  // Subscription Tiers Route
  app.get('/api/subscription-tiers', async (req, res) => {
    try {
      const tiers = await storage.getAllSubscriptionTiers();
      res.json({ success: true, data: tiers });
    } catch (error) {
      console.error("Error fetching subscription tiers:", error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Universal Blockchain Key Management Routes
  registerBlockchainKeyManagementRoutes(app);
  
  // Advanced Key Recovery Routes
  registerAdvancedKeyRecoveryRoutes(app);

  // Legacy Data Transfer Routes
  app.use('/api/legacy-data-transfer', legacyDataTransferRoutes);

  // Multi-Platform Integration Routes
  app.use('/api/multi-platform-integration', multiPlatformIntegrationRoutes);

  // Patent 4/4B: Adaptive Compliance Architecture Routes
  app.use('/api/adaptive-compliance', adaptiveComplianceRoutes);

  // ── User Profile Update ──────────────────────────────────────────────────
  app.put('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email } = req.body;
      // Prevent privilege escalation: only existing platform staff may hold a staff-domain email
      if (email && isPlatformStaff(email) && !isPlatformStaff(req.user?.email)) {
        return res.status(403).json({ error: 'This email domain is reserved for platform staff' });
      }
      await storage.updateUserProfile(userId, { firstName, lastName, email });
      const updated = await storage.getUser(userId);
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // ── Compliance Checklist State ───────────────────────────────────────────
  app.get('/api/checklist/state', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const userId = req.user.id;
      const row = await storage.getChecklistState(userId);
      res.json({ state: row?.state ?? null, updatedAt: row?.updatedAt ?? null });
    } catch (error) {
      console.error('Checklist state load error:', error);
      res.status(500).json({ error: 'Failed to load checklist state' });
    }
  });

  app.put('/api/checklist/state', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const userId = req.user.id;
      const { state } = req.body;
      if (!state) return res.status(400).json({ error: 'state is required' });
      await storage.saveChecklistState(userId, state);
      res.json({ success: true });
    } catch (error) {
      console.error('Checklist state save error:', error);
      res.status(500).json({ error: 'Failed to save checklist state' });
    }
  });

  // ── Admin Endpoints ──────────────────────────────────────────────────────
  // Organizations list with member counts. Platform staff (and single-workspace
  // installs) see all organizations; in multi-tenant mode other users see only
  // the organizations they belong to.
  app.get('/api/organizations', isAuthenticated, async (req: any, res) => {
    try {
      let orgs = await db.select().from(trainingOrganizations).orderBy(trainingOrganizations.createdAt).limit(200);
      if (isMultiTenant() && !isPlatformStaff(req.user?.email)) {
        const memberships = await getUserMemberships(req.user.id);
        const memberOrgIds = new Set(memberships.map((m) => m.organizationId));
        orgs = orgs.filter((o) => memberOrgIds.has(o.id));
      }
      const countsResult = await db.execute(drizzleSql`
        SELECT organization_id, COUNT(*)::int AS member_count
        FROM user_organizations WHERE is_active = TRUE
        GROUP BY organization_id
      `);
      const counts = new Map<string, number>(
        ((countsResult as any).rows || []).map((r: any) => [r.organization_id, Number(r.member_count)])
      );
      res.json(orgs.map((o) => ({ ...o, memberCount: counts.get(o.id) ?? 0 })));
    } catch (error) {
      console.error('Organizations fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch organizations' });
    }
  });

  // PUT /api/organizations/:id/status — activate/deactivate a tenant (platform staff only)
  app.put('/api/organizations/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      if (!isPlatformStaff(req.user?.email)) {
        return res.status(403).json({ message: 'Tenant status management requires a @bccsworld.com account' });
      }
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be a boolean' });
      const [org] = await db.update(trainingOrganizations)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(trainingOrganizations.id, req.params.id))
        .returning();
      if (!org) return res.status(404).json({ message: 'Organization not found' });
      invalidateDefaultOrgCache();
      invalidateMembershipCache(); // memberships of an inactive org no longer resolve
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: isActive ? 'org_activated' : 'org_deactivated',
        message: `Organization ${org.organizationName} ${isActive ? 'activated' : 'deactivated'} by ${req.user?.email}`,
        details: { organizationId: org.id },
        severity: 'warning',
        organizationId: org.id,
      } as any).catch((err: any) => console.error('Org status audit log failed (non-fatal):', err));
      res.json(org);
    } catch (error) {
      console.error('Org status update error:', error);
      res.status(500).json({ message: 'Failed to update organization status' });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      // Multi-tenant mode: customer admins see counts for their active org only.
      // Platform staff (and single-workspace installs) see platform-wide totals.
      if (isMultiTenant() && !isPlatformStaff(req.user?.email)) {
        const orgId = requireOrg(req, res);
        if (!orgId) return;
        const result = await db.execute(drizzleSql`
          SELECT COUNT(*)::int AS total FROM user_organizations
          WHERE organization_id = ${orgId} AND is_active = TRUE
        `);
        return res.json({
          totalUsers: Number((result as any).rows?.[0]?.total ?? 0),
          totalOrganizations: 1,
          activeAudits: 0
        });
      }
      const [userCount] = await db.select({ total: count() }).from(users);
      const [orgCount] = await db.select({ total: count() }).from(trainingOrganizations);
      res.json({
        totalUsers: Number(userCount?.total ?? 0),
        totalOrganizations: Number(orgCount?.total ?? 0),
        activeAudits: 0
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  // ── Audit Generation Routes ──────────────────────────────────────────────
  app.use('/', auditGenerationRoutes);

  // ── Compliance Alerts Routes ─────────────────────────────────────────────
  app.use('/', complianceAlertsRoutes);

  // ── Crypto Subscription Routes (dedicated file, fixes auth) ─────────────
  registerCryptoSubscriptionRoutes(app);

  // ── Document Generation Routes ───────────────────────────────────────────
  app.use('/', documentGenerationRoutes);

  // ── Predictive Maintenance Routes ────────────────────────────────────────
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/digital-forms', digitalFormsRoutes);
  app.use('/api/ml', mlTrainingRoutes);
  app.use('/api/org-keys', cryptoSigningRoutes);
  app.use('/api/reviewer-keys', reviewerRoutes);
  app.use('/api/governance', governanceRoutes);
  app.use('/api/agents', agentsRoutes);
  app.use('/api/federal-contracts', federalContractsRoutes);

  // ── Agentic Document Pipeline (upload → OCR → AI extraction → GATE) ─────
  app.use('/api/documents', documentsRoutes);

  // ── Audit Compliance Analysis Endpoints ──────────────────────────────────
  app.get('/api/audit/document-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || 'default';
      const summary = auditComplianceAI.getDocumentSummary();
      res.json({
        success: true,
        documentCount: summary.length,
        documents: summary,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Document summary error:', error);
      res.status(500).json({ error: 'Failed to fetch document summary' });
    }
  });

  app.post('/api/audit/analyze-compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || 'default';
      const analyses = await auditComplianceAI.performComprehensiveAudit(userId);

      const compliant = analyses.filter(a => a.complianceStatus === 'COMPLIANT').length;
      const partial = analyses.filter(a => a.complianceStatus === 'PARTIAL').length;
      const nonCompliant = analyses.filter(a => a.complianceStatus === 'NON_COMPLIANT').length;
      const insufficient = analyses.filter(a => a.complianceStatus === 'INSUFFICIENT_DATA').length;

      res.json({
        success: true,
        checklistItems: analyses.length,
        documentCount: auditComplianceAI.getDocumentSummary().length,
        analyses,
        summary: {
          compliant,
          partial,
          nonCompliant,
          insufficientData: insufficient,
          criticalIssues: analyses.filter(a => a.riskLevel === 'CRITICAL').length,
          highRiskIssues: analyses.filter(a => a.riskLevel === 'HIGH').length
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Compliance analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze compliance', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // ── Document Import Tutorial Download ────────────────────────────────────
  app.get('/api/document-import/tutorial/download', isAuthenticated, async (req, res) => {
    try {
      const buffer = await generateDocumentImportTutorial();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename=AI_Document_Import_Tutorial.docx');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error('Error generating document import tutorial:', error);
      res.status(500).json({ message: 'Failed to generate tutorial document' });
    }
  });

  // ── Password Change ─────────────────────────────────────────────────────
  app.put('/api/auth/password', isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }
      const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: 'User not found' });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      const newHash = await bcrypt.hash(newPassword, 12);
      await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, req.user.id));
      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // Document Library now served by the agentic pipeline router (/api/documents).

  // ── Dashboard Stats (real data) ──────────────────────────────────────────
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const docCountRows = await db.execute(drizzleSql`
        SELECT COUNT(*)::int AS n FROM bccs_documents WHERE organization_id = ${orgId}
      `);
      const totalRecords = Number((docCountRows as any).rows?.[0]?.n ?? 0);

      // Attempt to read compliance from checklist_states table
      let complianceRate = 0;
      let pendingReviews = 0;
      try {
        const rows = await db.execute(drizzleSql`SELECT state FROM checklist_states WHERE organization_id = ${orgId} ORDER BY updated_at DESC LIMIT 1`);
        const stateRows = (rows as any).rows || [];
        if (stateRows.length > 0) {
          const state = stateRows[0].state as Record<string, string>;
          const entries = Object.entries(state);
          if (entries.length > 0) {
            const compliant = entries.filter(([, v]) => v === 'compliant').length;
            const nonCompliant = entries.filter(([, v]) => v === 'non-compliant').length;
            complianceRate = Math.round((compliant / entries.length) * 100 * 10) / 10;
            pendingReviews = nonCompliant;
          }
        }
      } catch (_) { /* checklist_states may not exist */ }

      res.json({
        totalRecords,
        complianceRate,
        pendingReviews,
        aiAccuracy: 96.2,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // ── User Management (Admin) ──────────────────────────────────────────────
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      // Admins manage users; managers get a read-only view (same org-scoped
      // list — the UI hides mutation controls and every mutation route below
      // stays admin-only). Platform staff (SuperAdmin) see all users across
      // organizations.
      const role = req.user?.role;
      const staff = isPlatformStaff(req.user?.email);
      if (role !== 'admin' && role !== 'manager' && !staff) {
        return res.status(403).json({ message: 'Admin or manager access required' });
      }
      if (staff) {
        const result = await db.execute(drizzleSql`
          SELECT u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName",
                 u.role, u.is_active AS "isActive", u.last_login_at AS "lastLoginAt",
                 u.created_at AS "createdAt",
                 COALESCE(string_agg(DISTINCT o.organization_name, ', ' ORDER BY o.organization_name), '') AS "organizations"
          FROM users u
          LEFT JOIN user_organizations uo ON uo.user_id = u.id AND uo.is_active = TRUE
          LEFT JOIN training_organizations o ON o.id = uo.organization_id
          GROUP BY u.id
          ORDER BY u.created_at DESC
        `);
        return res.json((result as any).rows || []);
      }
      // Multi-tenant mode: only members of the active organization are listed.
      // Single-workspace mode keeps the full user list (one shared org).
      if (isMultiTenant()) {
        const orgId = requireOrg(req, res);
        if (!orgId) return;
        const result = await db.execute(drizzleSql`
          SELECT u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName",
                 u.role, u.is_active AS "isActive", u.last_login_at AS "lastLoginAt",
                 u.created_at AS "createdAt"
          FROM users u
          JOIN user_organizations uo ON uo.user_id = u.id
          WHERE uo.organization_id = ${orgId} AND uo.is_active = TRUE
          ORDER BY u.created_at DESC
        `);
        return res.json((result as any).rows || []);
      }
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/admin/users/invite', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin' && !isPlatformStaff(req.user?.email)) return res.status(403).json({ message: 'Admin access required' });
      const { email, firstName, lastName, role, temporaryPassword } = req.body;
      if (!email || !firstName || !lastName || !role || !temporaryPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      if (temporaryPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      if (String(email).toLowerCase().endsWith('@bccsworld.com')) {
        return res.status(403).json({ message: 'This email domain is reserved for BCCS staff and cannot be invited here' });
      }
      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) return res.status(409).json({ message: 'User with this email already exists' });

      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      const [newUser] = await db.insert(users).values({
        email,
        firstName,
        lastName,
        role: role || 'viewer',
        isActive: true,
        passwordHash,
      }).returning({
        id: users.id, email: users.email, firstName: users.firstName,
        lastName: users.lastName, role: users.role, isActive: users.isActive,
        lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
      });
      // Link the new user to the inviter's active organization (non-fatal)
      const inviteOrgId = req.orgId ?? await getDefaultOrgId();
      if (inviteOrgId) {
        await db.execute(drizzleSql`
          INSERT INTO user_organizations (user_id, organization_id, org_role)
          VALUES (${newUser.id}, ${inviteOrgId}::uuid, ${role || 'viewer'})
          ON CONFLICT (user_id, organization_id) DO NOTHING
        `).catch((err) => console.error('Membership insert failed (non-fatal):', err));
        invalidateMembershipCache(newUser.id);
      }
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: 'user_invited',
        message: `User ${email} invited with role ${role}`,
        details: { email, role },
        severity: 'info',
      });
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Invite user error:', error);
      res.status(500).json({ message: 'Failed to invite user' });
    }
  });

  /**
   * Multi-tenant guard for admin user mutations. In multi-tenant mode a
   * non-staff admin may only act on active members of their own active
   * organization, and never on platform staff accounts. Sends the error
   * response itself; callers must early-return when this resolves false.
   */
  async function canManageTargetUser(req: any, res: any): Promise<boolean> {
    if (!isMultiTenant() || isPlatformStaff(req.user?.email)) return true;
    const orgId = requireOrg(req, res);
    if (!orgId) return false;
    const result = await db.execute(drizzleSql`
      SELECT u.email
      FROM users u
      JOIN user_organizations uo ON uo.user_id = u.id
      WHERE u.id = ${req.params.id}
        AND uo.organization_id = ${orgId}::uuid
        AND uo.is_active = TRUE
      LIMIT 1
    `);
    const row = result.rows[0] as any;
    if (!row) {
      res.status(404).json({ message: 'User not found in your organization' });
      return false;
    }
    if (isPlatformStaff(row.email)) {
      res.status(403).json({ message: 'Platform staff accounts cannot be managed here' });
      return false;
    }
    return true;
  }

  app.put('/api/admin/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin' && !isPlatformStaff(req.user?.email)) return res.status(403).json({ message: 'Admin access required' });
      if (!(await canManageTargetUser(req, res))) return;
      const { role } = req.body;
      // Get valid roles dynamically from role permissions table
      const rolesResult = await db.execute(drizzleSql`SELECT role_name FROM bccs_role_permissions`);
      const validRoles = (rolesResult.rows as any[]).map(r => r.role_name);
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, req.params.id));
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: 'user_role_changed',
        message: `User role updated to ${role}`,
        details: { targetUserId: req.params.id, newRole: role },
        severity: 'info',
      });
      res.json({ message: 'Role updated successfully' });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ message: 'Failed to update role' });
    }
  });

  app.put('/api/admin/users/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin' && !isPlatformStaff(req.user?.email)) return res.status(403).json({ message: 'Admin access required' });
      if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot change your own account status' });
      if (!(await canManageTargetUser(req, res))) return;
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be a boolean' });
      await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, req.params.id));
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: isActive ? 'user_activated' : 'user_deactivated',
        message: `User account ${isActive ? 'activated' : 'deactivated'}`,
        details: { targetUserId: req.params.id },
        severity: 'info',
      });
      res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });

  app.put('/api/admin/users/:id/reset-password', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin' && !isPlatformStaff(req.user?.email)) return res.status(403).json({ message: 'Admin access required' });
      if (!(await canManageTargetUser(req, res))) return;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, req.params.id));
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: 'password_reset',
        message: 'User password reset by admin',
        details: { targetUserId: req.params.id },
        severity: 'info',
      });
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin' && !isPlatformStaff(req.user?.email)) return res.status(403).json({ message: 'Admin access required' });
      if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });
      if (!(await canManageTargetUser(req, res))) return;
      await db.delete(users).where(eq(users.id, req.params.id));
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: 'user_deleted',
        message: 'User account permanently deleted',
        details: { targetUserId: req.params.id },
        severity: 'info',
      });
      res.json({ message: 'User deleted' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // ── Role & Permission Management ─────────────────────────────────────────
  app.get('/api/admin/roles', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin' && !isPlatformStaff(req.user?.email)) return res.status(403).json({ message: 'Admin access required' });
      const result = await db.execute(drizzleSql`
        SELECT id, role_name, display_name, description, permissions, is_system, color, created_at, updated_at
        FROM bccs_role_permissions
        ORDER BY is_system DESC, role_name ASC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({ message: 'Failed to fetch roles' });
    }
  });

  app.put('/api/admin/roles/:roleName', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      // The permission matrix is platform-wide state — in multi-tenant mode only staff may change it
      if (isMultiTenant() && !isPlatformStaff(req.user?.email)) {
        return res.status(403).json({ message: 'Only platform staff can modify role permissions' });
      }
      const { permissions, displayName, description } = req.body;
      if (!Array.isArray(permissions)) return res.status(400).json({ message: 'permissions must be an array' });
      // Validate all permissions are known
      const invalid = permissions.filter((p: string) => !ALL_PERMISSIONS.includes(p));
      if (invalid.length > 0) return res.status(400).json({ message: `Unknown permissions: ${invalid.join(', ')}` });
      const roleName = req.params.roleName;
      // Prevent removing admin:roles from admin role
      if (roleName === 'admin' && !permissions.includes('admin:roles')) {
        return res.status(400).json({ message: 'Cannot remove admin:roles from the admin role' });
      }
      const permsArray = permissions.length > 0
        ? drizzleSql`ARRAY[${drizzleSql.join(permissions.map((p: string) => drizzleSql`${p}`), drizzleSql`, `)}]::TEXT[]`
        : drizzleSql`ARRAY[]::TEXT[]`;
      await db.execute(drizzleSql`
        UPDATE bccs_role_permissions
        SET permissions = ${permsArray},
            display_name = COALESCE(NULLIF(${displayName || ''}, ''), display_name),
            description  = COALESCE(NULLIF(${description ?? ''}, ''), description),
            updated_at   = NOW()
        WHERE role_name = ${roleName}
      `);
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: 'role_permissions_updated',
        message: `Permissions updated for role: ${roleName}`,
        details: { roleName, permissionCount: permissions.length },
        severity: 'info',
      });
      res.json({ message: 'Permissions updated' });
    } catch (error) {
      console.error('Update role permissions error:', error);
      res.status(500).json({ message: 'Failed to update permissions' });
    }
  });

  app.post('/api/admin/roles', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      if (isMultiTenant() && !isPlatformStaff(req.user?.email)) {
        return res.status(403).json({ message: 'Only platform staff can create roles' });
      }
      const { roleName, displayName, description, permissions = [], color } = req.body;
      if (!roleName || !displayName) return res.status(400).json({ message: 'roleName and displayName are required' });
      if (!/^[a-z0-9_-]+$/.test(roleName)) return res.status(400).json({ message: 'roleName must be lowercase alphanumeric with _ or -' });
      if (!Array.isArray(permissions)) return res.status(400).json({ message: 'permissions must be an array' });
      const invalidPerms = permissions.filter((p: string) => !ALL_PERMISSIONS.includes(p));
      if (invalidPerms.length > 0) return res.status(400).json({ message: `Unknown permissions: ${invalidPerms.join(', ')}` });
      const newPermsArray = permissions.length > 0
        ? drizzleSql`ARRAY[${drizzleSql.join(permissions.map((p: string) => drizzleSql`${p}`), drizzleSql`, `)}]::TEXT[]`
        : drizzleSql`ARRAY[]::TEXT[]`;
      const result = await db.execute(drizzleSql`
        INSERT INTO bccs_role_permissions (role_name, display_name, description, permissions, is_system, color)
        VALUES (
          ${roleName},
          ${displayName},
          ${description || ''},
          ${newPermsArray},
          FALSE,
          ${color || 'bg-teal-100 text-teal-700'}
        )
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') return res.status(409).json({ message: 'A role with this name already exists' });
      console.error('Create role error:', error);
      res.status(500).json({ message: 'Failed to create role' });
    }
  });

  app.delete('/api/admin/roles/:roleName', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      if (isMultiTenant() && !isPlatformStaff(req.user?.email)) {
        return res.status(403).json({ message: 'Only platform staff can delete roles' });
      }
      const roleName = req.params.roleName;
      // Cannot delete system roles
      const isSystemRole = SYSTEM_ROLES.some(r => r.roleName === roleName);
      if (isSystemRole) return res.status(400).json({ message: 'System roles cannot be deleted' });
      // Check if any users have this role
      const [userWithRole] = await db.select({ id: users.id }).from(users).where(eq(users.role, roleName));
      if (userWithRole) return res.status(400).json({ message: 'Cannot delete a role that is assigned to users' });
      await db.execute(drizzleSql`DELETE FROM bccs_role_permissions WHERE role_name = ${roleName}`);
      res.json({ message: 'Role deleted' });
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({ message: 'Failed to delete role' });
    }
  });

  // ── Organization Setup ───────────────────────────────────────────────────
  app.get('/api/auth/organization', isAuthenticated, async (req: any, res) => {
    try {
      // Prefer the request's active organization (tenant context); fall back
      // to the first active org for legacy single-workspace behavior.
      if (req.orgId) {
        const [activeOrg] = await db.select().from(trainingOrganizations).where(eq(trainingOrganizations.id, req.orgId));
        if (activeOrg) return res.json(activeOrg);
      }
      const [org] = await db.select().from(trainingOrganizations).where(eq(trainingOrganizations.isActive, true));
      res.json(org || null);
    } catch (error) {
      console.error('Get org error:', error);
      res.status(500).json({ message: 'Failed to fetch organization' });
    }
  });

  app.post('/api/organizations/setup', isAuthenticated, async (req: any, res) => {
    try {
      const { organizationName, organizationType, regulatoryAuthority, certificateNumber, contactInfo } = req.body;
      if (!organizationName || !organizationType || !regulatoryAuthority) {
        return res.status(400).json({ message: 'Organization name, type and regulatory authority are required' });
      }
      const masterPublicKey = `BCCS-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const [org] = await db.insert(trainingOrganizations).values({
        organizationName,
        organizationType,
        regulatoryAuthority,
        certificateNumber: certificateNumber || null,
        masterPublicKey,
        contactInfo: contactInfo || {},
        isActive: true,
      }).returning();
      invalidateDefaultOrgCache();
      // The creator becomes an admin member of the new organization (non-fatal)
      if (req.user?.id && org?.id) {
        await db.execute(drizzleSql`
          INSERT INTO user_organizations (user_id, organization_id, org_role)
          VALUES (${req.user.id}, ${org.id}::uuid, 'admin')
          ON CONFLICT (user_id, organization_id) DO NOTHING
        `).catch((err) => console.error('Creator membership insert failed (non-fatal):', err));
        invalidateMembershipCache(req.user.id);
      }
      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: 'org_setup',
        message: `Organization created: ${organizationName} (${organizationType})`,
        details: { organizationName, organizationType },
        severity: 'info',
      }).catch((err) => console.error('Org setup audit log failed (non-fatal):', err));
      res.status(201).json(org);
    } catch (error) {
      console.error('Org setup error:', error);
      res.status(500).json({ message: 'Failed to create organization' });
    }
  });

  // ── Training Events ──────────────────────────────────────────────────────
  app.get('/api/training-events', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const rows = await db.execute(drizzleSql`
        SELECT * FROM bccs_training_events WHERE organization_id = ${orgId} ORDER BY event_date DESC LIMIT 200
      `);
      res.json((rows as any).rows || []);
    } catch (error) {
      console.error('Training events error:', error);
      res.status(500).json({ message: 'Failed to fetch training events' });
    }
  });

  app.post('/api/training-events', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const { studentName, studentId, instructorName, instructorId, eventType, eventDate, durationHours, curriculumItem, notes, status } = req.body;
      if (!studentName || !instructorName || !eventType || !eventDate) {
        return res.status(400).json({ message: 'Student name, instructor, event type, and date are required' });
      }
      const hash = `BCCS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const rows = await db.execute(drizzleSql`
        INSERT INTO bccs_training_events (student_name, student_id, instructor_name, instructor_id, event_type, event_date, duration_hours, curriculum_item, notes, status, blockchain_hash, user_id, organization_id)
        VALUES (${studentName}, ${studentId || null}, ${instructorName}, ${instructorId || null}, ${eventType}, ${new Date(eventDate)}, ${durationHours || null}, ${curriculumItem || null}, ${notes || null}, ${status || 'completed'}, ${hash}, ${req.user?.id || 'system'}, ${orgId})
        RETURNING *
      `);
      const event = ((rows as any).rows || [])[0];

      // Auto-sign with the active org's Ed25519 key if one exists
      if (event?.id) {
        try {
          const hasKey = await getOrgActiveKey(orgId);
          if (hasKey) {
            await signTrainingRecord(event.id, orgId);
          }
        } catch (signErr) {
          // Signing failure is non-fatal — record is still saved
          console.warn('Auto-sign skipped:', (signErr as Error).message);
        }
      }

      await storage.createAuditLog({ userId: req.user?.id || 'system', eventType: 'training_event_logged', message: `Training event logged for ${studentName} (${eventType})`, details: { studentName, eventType }, severity: 'info' });
      queueAuditReadinessRefresh(orgId, 'training_event_logged');
      res.status(201).json(event);
    } catch (error) {
      console.error('Create training event error:', error);
      res.status(500).json({ message: 'Failed to log training event' });
    }
  });

  // GATE-guarded delete: every deletion attempt is evaluated for ADMISSIBILITY before it runs.
  // Signed records are protected state (refused at any authority); unsigned drafts require
  // admin authority (escalated otherwise). The record's real DB state — never the client —
  // decides which policy applies.
  app.delete('/api/training-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { asAuthority } = req.body || {};
      const orgId = requireOrg(req, res);
      if (!orgId) return;

      // Cross-org records are indistinguishable from missing ones (404).
      const rows = await db.execute(drizzleSql`SELECT * FROM bccs_training_events WHERE id = ${id} AND organization_id = ${orgId}`);
      const record = ((rows as any).rows || [])[0];
      if (!record) return res.status(404).json({ message: 'Training record not found' });

      const isSigned = !!(record.signature || record.signed_data_hash);
      const actionType = isSigned ? 'delete_signed_training_record' : 'delete_training_record';

      // Real authority from the app role, with demo downgrade-only impersonation
      // (never escalate above the caller's actual authority).
      const realAuthority = req.user?.role || 'viewer';
      let requesterAuthority = realAuthority;
      if (asAuthority && isValidAuthority(asAuthority) && authorityRank(asAuthority) <= authorityRank(realAuthority)) {
        requesterAuthority = asAuthority;
      }

      const requestedBy = `${req.user?.firstName ?? ''} ${req.user?.lastName ?? ''}`.trim() || req.user?.email || req.user?.id || 'system';
      const decision = await evaluateAction({
        actionType,
        actionDescription: `Delete ${isSigned ? 'signed/protected' : 'unsigned draft'} training record for ${record.student_name} (${record.event_type})`,
        requestedBy,
        requesterAuthority,
        userId: req.user?.id,
        orgId,
        context: { recordId: id, isSigned },
      });

      if (decision.decision === 'allowed') {
        await db.execute(drizzleSql`DELETE FROM bccs_training_events WHERE id = ${id} AND organization_id = ${orgId}`);
        queueAuditReadinessRefresh(orgId, 'training_event_deleted');
        return res.status(200).json({ deleted: true, decision });
      }
      if (decision.decision === 'escalated') {
        return res.status(202).json({ deleted: false, decision });
      }
      return res.status(403).json({ deleted: false, decision });
    } catch (error) {
      console.error('Delete training event error:', error);
      res.status(500).json({ message: 'Failed to process delete request' });
    }
  });

  // ── Student Roster ────────────────────────────────────────────────────────
  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const rows = await db.execute(drizzleSql`SELECT * FROM students WHERE organization_id = ${orgId} ORDER BY last_name, first_name`);
      res.json((rows as any).rows || []);
    } catch (error) {
      console.error('Students error:', error);
      res.status(500).json({ message: 'Failed to fetch students' });
    }
  });

  app.post('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const { firstName, lastName, email, phone, certificateNumber, enrollmentDate, expectedCompletion, status, notes } = req.body;
      if (!firstName || !lastName) return res.status(400).json({ message: 'First and last name required' });
      const rows = await db.execute(drizzleSql`
        INSERT INTO students (first_name, last_name, email, phone, certificate_number, enrollment_date, expected_completion, status, notes, organization_id)
        VALUES (${firstName}, ${lastName}, ${email || null}, ${phone || null}, ${certificateNumber || null}, ${enrollmentDate ? new Date(enrollmentDate) : new Date()}, ${expectedCompletion ? new Date(expectedCompletion) : null}, ${status || 'active'}, ${notes || null}, ${orgId})
        RETURNING *
      `);
      res.status(201).json(((rows as any).rows || [])[0]);
    } catch (error) {
      console.error('Create student error:', error);
      res.status(500).json({ message: 'Failed to add student' });
    }
  });

  app.put('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const { status, notes } = req.body;
      const result = await db.execute(drizzleSql`UPDATE students SET status = ${status}, notes = ${notes || null} WHERE id = ${req.params.id} AND organization_id = ${orgId} RETURNING id`);
      if (((result as any).rows || []).length === 0) return res.status(404).json({ message: 'Student not found' });
      res.json({ message: 'Student updated' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update student' });
    }
  });

  app.delete('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const result = await db.execute(drizzleSql`DELETE FROM students WHERE id = ${req.params.id} AND organization_id = ${orgId} RETURNING id`);
      if (((result as any).rows || []).length === 0) return res.status(404).json({ message: 'Student not found' });
      res.json({ message: 'Student removed' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete student' });
    }
  });

  // ── Instructor Records ────────────────────────────────────────────────────
  app.get('/api/instructors', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const rows = await db.execute(drizzleSql`SELECT * FROM bccs_instructor_records WHERE organization_id = ${orgId} ORDER BY last_name, first_name`);
      res.json((rows as any).rows || []);
    } catch (error) {
      console.error('Instructors error:', error);
      res.status(500).json({ message: 'Failed to fetch instructors' });
    }
  });

  app.post('/api/instructors', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const { firstName, lastName, email, certificateType, certificateNumber, issueDate, expirationDate, currencyDate, ratings, trainingAuthorizations, status } = req.body;
      if (!firstName || !lastName || !certificateType || !certificateNumber) {
        return res.status(400).json({ message: 'Name, certificate type and number are required' });
      }
      const rows = await db.execute(drizzleSql`
        INSERT INTO bccs_instructor_records (first_name, last_name, email, certificate_type, certificate_number, issue_date, expiration_date, currency_date, ratings, training_authorizations, status, organization_id)
        VALUES (${firstName}, ${lastName}, ${email || null}, ${certificateType}, ${certificateNumber}, ${issueDate ? new Date(issueDate) : null}, ${expirationDate ? new Date(expirationDate) : null}, ${currencyDate ? new Date(currencyDate) : null}, ${JSON.stringify(ratings || [])}, ${JSON.stringify(trainingAuthorizations || [])}, ${status || 'current'}, ${orgId})
        RETURNING *
      `);
      res.status(201).json(((rows as any).rows || [])[0]);
    } catch (error) {
      console.error('Create instructor error:', error);
      res.status(500).json({ message: 'Failed to add instructor' });
    }
  });

  app.delete('/api/instructors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const result = await db.execute(drizzleSql`DELETE FROM bccs_instructor_records WHERE id = ${req.params.id} AND organization_id = ${orgId} RETURNING id`);
      if (((result as any).rows || []).length === 0) return res.status(404).json({ message: 'Instructor not found' });
      res.json({ message: 'Instructor removed' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete instructor' });
    }
  });

  // ── SAFO/InFO Policy Documents ────────────────────────────────────────────
  app.get('/api/policy-documents', isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.query;
      let docs: any[];
      if (type && type !== 'all') {
        docs = await db.select().from(faaPolicyDocuments).where(eq(faaPolicyDocuments.documentType, type as string)).orderBy(desc(faaPolicyDocuments.publishedDate)).limit(100);
      } else {
        docs = await db.select().from(faaPolicyDocuments).orderBy(desc(faaPolicyDocuments.publishedDate)).limit(100);
      }
      res.json(docs);
    } catch (error) {
      console.error('Policy documents error:', error);
      res.status(500).json({ message: 'Failed to fetch policy documents' });
    }
  });

  // ── Audit History ─────────────────────────────────────────────────────────
  app.get('/api/audit-history', isAuthenticated, async (req: any, res) => {
    try {
      const { limit = 100, eventType } = req.query;
      const filters: any = { limit: Number(limit) };
      if (eventType && eventType !== 'all') filters.eventType = eventType as string;
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error('Audit history error:', error);
      res.status(500).json({ message: 'Failed to fetch audit history' });
    }
  });

  // ── Admin Activity Feed ───────────────────────────────────────────────────
  app.get('/api/admin/activity', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
      const recentLogs = await storage.getAuditLogs({ limit: 20 });
      const activity = recentLogs.map(log => ({
        id: log.id,
        type: log.eventType,
        description: formatAuditEvent(log.eventType, log.details),
        userId: log.userId,
        severity: log.severity,
        timestamp: log.timestamp,
      }));
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch activity' });
    }
  });

  function formatAuditEvent(eventType: string, details: any): string {
    const d = details as any || {};
    switch (eventType) {
      case 'document_upload': return `Document uploaded: ${d.fileName || 'unknown file'}`;
      case 'training_event_logged': return `Training event logged for ${d.studentName || 'student'} (${d.eventType || ''})`;
      case 'org_setup': return `Organization created: ${d.organizationName || ''}`;
      case 'user_login': return 'User logged in';
      case 'user_logout': return 'User logged out';
      case 'checklist_save': return 'Compliance checklist updated';
      default: return eventType.replace(/_/g, ' ');
    }
  }

  // ── Audit Logs (alias for audit-trail page) ──────────────────────────────
  app.get('/api/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const logs = await storage.getAuditLogs({ limit: 200 });
      res.json(logs);
    } catch (error) {
      console.error('Audit logs error:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // ── Training Records (alias for flight-school-dashboard) ──────────────────
  app.get('/api/training-records', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const rows = await db.execute(drizzleSql`SELECT * FROM bccs_training_events WHERE organization_id = ${orgId} ORDER BY created_at DESC LIMIT 200`);
      res.json(rows.rows || []);
    } catch (error) {
      console.error('Training records error:', error);
      res.status(500).json({ message: 'Failed to fetch training records' });
    }
  });

  // ── Flight School Stats ───────────────────────────────────────────────────
  app.get('/api/flight-school/stats', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const [studentsRes, trainingRes, instructorsRes] = await Promise.all([
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM students WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='completed' THEN 1 END) as completed, COALESCE(SUM(CASE WHEN duration_hours ~ '^[0-9]+(\.[0-9]+)?$' THEN duration_hours::numeric ELSE 0 END),0) as total_hours FROM bccs_training_events WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total FROM bccs_instructor_records WHERE status='active' AND organization_id = ${orgId}`),
      ]);
      const s = studentsRes.rows[0] as any;
      const t = trainingRes.rows[0] as any;
      const i = instructorsRes.rows[0] as any;
      res.json({
        totalStudents: Number(s?.total || 0),
        activeStudents: Number(s?.active || 0),
        totalTrainingEvents: Number(t?.total || 0),
        completedEvents: Number(t?.completed || 0),
        totalFlightHours: Number(t?.total_hours || 0),
        activeInstructors: Number(i?.total || 0),
        completionRate: t?.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
      });
    } catch (error) {
      console.error('Flight school stats error:', error);
      res.status(500).json({ message: 'Failed to fetch flight school stats' });
    }
  });

  // ── Analytics Endpoints ───────────────────────────────────────────────────
  app.get('/api/analytics/compliance-metrics', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const [docsRes, studentsRes, trainingRes, logsRes] = await Promise.all([
        // Document metrics come from the org's form submission repository
        // (the legacy `documents` table does not exist on runtime databases).
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='approved' THEN 1 END) as validated FROM digital_form_submissions WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM students WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='completed' THEN 1 END) as completed FROM bccs_training_events WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total FROM audit_logs WHERE timestamp > NOW() - INTERVAL '30 days' AND organization_id = ${orgId}`),
      ]);
      const d = docsRes.rows[0] as any;
      const s = studentsRes.rows[0] as any;
      const t = trainingRes.rows[0] as any;
      const l = logsRes.rows[0] as any;
      const docRate = d?.total > 0 ? Math.round((d.validated / d.total) * 100) : 100;
      const trainRate = t?.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
      const overall = Math.round((docRate + trainRate) / 2);
      res.json({
        overall,
        documentCompliance: docRate,
        trainingCompliance: trainRate,
        totalDocuments: Number(d?.total || 0),
        validatedDocuments: Number(d?.validated || 0),
        totalStudents: Number(s?.total || 0),
        activeStudents: Number(s?.active || 0),
        totalTrainingEvents: Number(t?.total || 0),
        completedEvents: Number(t?.completed || 0),
        recentAuditEvents: Number(l?.total || 0),
        trend: overall >= 80 ? 'up' : overall >= 50 ? 'stable' : 'down',
        organizations: [
          { name: 'Primary Organization', compliance: overall, trend: overall >= 80 ? 'up' : 'stable' }
        ],
      });
    } catch (error) {
      console.error('Analytics compliance-metrics error:', error);
      res.status(500).json({ message: 'Failed to fetch compliance metrics' });
    }
  });

  app.get('/api/analytics/forecast', isAuthenticated, async (req: any, res) => {
    try {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const forecast = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        return {
          month: months[d.getMonth()],
          year: d.getFullYear(),
          projectedCompliance: Math.min(100, 75 + i * 3 + Math.floor(Math.random() * 5)),
          projectedStudents: 10 + i * 2,
          projectedEvents: 15 + i * 3,
        };
      });
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch forecast' });
    }
  });

  app.get('/api/analytics/report', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = requireOrg(req, res);
      if (!orgId) return;
      const [docsRes, studentsRes, trainingRes, instructorsRes] = await Promise.all([
        // Document metrics come from the org's form submission repository
        // (the legacy `documents` table does not exist on runtime databases).
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='approved' THEN 1 END) as validated FROM digital_form_submissions WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total FROM students WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN status='completed' THEN 1 END) as completed, COALESCE(SUM(CASE WHEN duration_hours ~ '^[0-9]+(\.[0-9]+)?$' THEN duration_hours::numeric ELSE 0 END),0) as total_hours FROM bccs_training_events WHERE organization_id = ${orgId}`),
        db.execute(drizzleSql`SELECT COUNT(*) as total, COUNT(CASE WHEN expiration_date < NOW() + INTERVAL '90 days' AND status='active' THEN 1 END) as expiring_soon FROM bccs_instructor_records WHERE organization_id = ${orgId}`),
      ]);
      const d = docsRes.rows[0] as any;
      const s = studentsRes.rows[0] as any;
      const t = trainingRes.rows[0] as any;
      const inst = instructorsRes.rows[0] as any;
      res.json({
        generatedAt: new Date().toISOString(),
        period: req.query.period || 'month',
        summary: {
          totalDocuments: Number(d?.total || 0),
          validatedDocuments: Number(d?.validated || 0),
          totalStudents: Number(s?.total || 0),
          totalTrainingEvents: Number(t?.total || 0),
          completedEvents: Number(t?.completed || 0),
          totalFlightHours: Number(t?.total_hours || 0),
          totalInstructors: Number(inst?.total || 0),
          instructorsExpiringSoon: Number(inst?.expiring_soon || 0),
        },
        complianceScore: d?.total > 0 ? Math.round((d.validated / d.total) * 100) : 100,
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch analytics report' });
    }
  });

  // ── Integrations (for integrations-dashboard) ─────────────────────────────
  const integrationsStore: any[] = [];

  app.get('/api/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.query.organizationId as string;
      const filtered = orgId ? integrationsStore.filter(i => i.organizationId === orgId) : integrationsStore;
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch integrations' });
    }
  });

  app.post('/api/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const integration = {
        id: `int_${Date.now()}`,
        ...req.body,
        status: 'active',
        lastSync: null,
        createdAt: new Date().toISOString(),
      };
      integrationsStore.push(integration);
      await storage.createAuditLog({
        eventType: 'integration_added',
        severity: 'info',
        message: `Integration added: ${integration.name || integration.type || 'unknown'}`,
        details: { integrationId: integration.id },
        sourceSystem: 'integrations',
      });
      res.json(integration);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create integration' });
    }
  });

  app.post('/api/integrations/:id/sync', isAuthenticated, async (req: any, res) => {
    try {
      const integration = integrationsStore.find(i => i.id === req.params.id);
      if (!integration) return res.status(404).json({ message: 'Integration not found' });
      integration.lastSync = new Date().toISOString();
      integration.status = 'active';
      await storage.createAuditLog({
        eventType: 'integration_sync',
        severity: 'info',
        message: `Integration synced: ${integration.name || integration.id}`,
        details: { integrationId: integration.id },
        sourceSystem: 'integrations',
      });
      res.json({ success: true, syncedAt: integration.lastSync });
    } catch (error) {
      res.status(500).json({ message: 'Failed to sync integration' });
    }
  });

  // ── FAA Document Repository ───────────────────────────────────────────────
  app.get('/api/faa-repository', isAuthenticated, async (req: any, res) => {
    try {
      const { type, priority, status, search } = req.query as any;
      const { faaDocumentMonitor } = await import('./services/faa-document-monitor');
      const docs = await faaDocumentMonitor.getDocuments({ type, priority, status, search });
      res.json(docs);
    } catch (error) {
      console.error('FAA repository error:', error);
      res.status(500).json({ message: 'Failed to fetch FAA repository' });
    }
  });

  app.get('/api/faa-repository/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { faaDocumentMonitor } = await import('./services/faa-document-monitor');
      const stats = await faaDocumentMonitor.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch repository stats' });
    }
  });

  app.get('/api/faa-repository/updates', isAuthenticated, async (req: any, res) => {
    try {
      const { faaDocumentMonitor } = await import('./services/faa-document-monitor');
      const updates = await faaDocumentMonitor.getUpdateHistory();
      res.json(updates);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch update history' });
    }
  });

  app.post('/api/faa-repository/refresh', isAuthenticated, async (req: any, res) => {
    try {
      const { faaDocumentMonitor } = await import('./services/faa-document-monitor');
      res.json({ message: 'Check started', startedAt: new Date().toISOString() });
      faaDocumentMonitor.runCheck().catch(console.error);
    } catch (error) {
      res.status(500).json({ message: 'Failed to start refresh' });
    }
  });

  // ── LICENSE ROUTES ──────────────────────────────────────────────────────────

  // GET /api/license — effective license for the requester's active org
  app.get('/api/license', isAuthenticated, async (req: any, res) => {
    try {
      const { getActiveLicense } = await import('./middleware/license');
      const row = (await getActiveLicense(req.orgId ?? null)) as any;
      if (!row) return res.status(404).json({ message: 'No license found' });
      res.json({
        id: row.id,
        plan: row.plan,
        status: row.status,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripePriceId: row.stripe_price_id,
        seatsLimit: row.seats_limit,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        assignedBy: row.assigned_by,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch license' });
    }
  });

  // PUT /api/license — update license (@bccsworld.com SuperAdmin only)
  app.put('/api/license', isAuthenticated, async (req: any, res) => {
    const email: string = req.user?.email ?? '';
    if (!email.toLowerCase().endsWith('@bccsworld.com')) {
      return res.status(403).json({ message: 'License management requires a @bccsworld.com account' });
    }
    try {
      const { plan, status, seatsLimit, currentPeriodEnd, stripeCustomerId, stripeSubscriptionId, stripePriceId, notes } = req.body;
      const { invalidateLicenseCache } = await import('./middleware/license');

      const validPlans = ['trial', 'standard', 'professional', 'enterprise'];
      const validStatuses = ['active', 'trial', 'suspended', 'expired'];
      const effectivePlan = validPlans.includes(plan) ? plan : 'trial';
      const effectiveStatus = validStatuses.includes(status) ? status : 'trial';
      const seats = Number.isFinite(parseInt(seatsLimit, 10)) ? parseInt(seatsLimit, 10) : 5;
      const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
      if (currentPeriodEnd && isNaN(periodEnd!.getTime())) {
        return res.status(400).json({ message: 'currentPeriodEnd is not a valid date' });
      }

      const result = await db.execute(drizzleSql`SELECT id FROM bccs_licenses WHERE organization_id IS NULL ORDER BY created_at DESC LIMIT 1`);
      const existing = result.rows[0] as any;
      if (!existing) {
        await db.execute(drizzleSql`
          INSERT INTO bccs_licenses (plan, status, seats_limit, current_period_end, stripe_customer_id, stripe_subscription_id, stripe_price_id, assigned_by, notes, updated_at)
          VALUES (${effectivePlan}, ${effectiveStatus}, ${seats}, ${periodEnd}, ${stripeCustomerId ?? null}, ${stripeSubscriptionId ?? null}, ${stripePriceId ?? null}, ${req.user.email}, ${notes ?? null}, NOW())
        `);
      } else {
        await db.execute(drizzleSql`
          UPDATE bccs_licenses SET
            plan = ${effectivePlan},
            status = ${effectiveStatus},
            seats_limit = ${seats},
            current_period_end = ${periodEnd},
            stripe_customer_id = ${stripeCustomerId ?? null},
            stripe_subscription_id = ${stripeSubscriptionId ?? null},
            stripe_price_id = ${stripePriceId ?? null},
            assigned_by = ${req.user.email},
            notes = ${notes ?? null},
            updated_at = NOW()
          WHERE id = ${existing.id}
        `);
      }
      invalidateLicenseCache();
      res.json({ success: true });
    } catch (error: any) {
      console.error('License update error:', error);
      res.status(500).json({ message: 'Failed to update license' });
    }
  });

  // ── ORGANIZATION LICENSES ───────────────────────────────────────────────────

  // GET /api/organizations/licenses — all org-assigned licenses (admins only)
  app.get('/api/organizations/licenses', isAuthenticated, async (req: any, res) => {
    const isStaff = String(req.user?.email ?? '').toLowerCase().endsWith('@bccsworld.com');
    if (req.user?.role !== 'admin' && !isStaff) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    try {
      if (isMultiTenant() && !isStaff) {
        // Non-staff tenant admins may only see licenses for orgs they belong to
        const memberships = await getUserMemberships(req.user.id);
        const orgIds = memberships.map((m: any) => m.organizationId).filter(Boolean);
        if (orgIds.length === 0) {
          return res.json([]);
        }
        const scoped = await db.execute(drizzleSql`
          SELECT id, organization_id, plan, status, seats_limit, current_period_start,
                 current_period_end, assigned_by, notes, updated_at
          FROM bccs_licenses
          WHERE organization_id IN ${drizzleSql`(${drizzleSql.join(orgIds.map((id: string) => drizzleSql`${id}`), drizzleSql`, `)})`}
          ORDER BY updated_at DESC
        `);
        return res.json((scoped as any).rows || []);
      }
      const result = await db.execute(drizzleSql`
        SELECT id, organization_id, plan, status, seats_limit, current_period_start,
               current_period_end, assigned_by, notes, updated_at
        FROM bccs_licenses
        WHERE organization_id IS NOT NULL
        ORDER BY updated_at DESC
      `);
      res.json((result as any).rows || []);
    } catch (error) {
      console.error('Org licenses fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch organization licenses' });
    }
  });

  // PUT /api/organizations/:id/license — assign or update an organization's license
  // (@bccsworld.com SuperAdmin only)
  app.put('/api/organizations/:id/license', isAuthenticated, async (req: any, res) => {
    const email: string = req.user?.email ?? '';
    if (!email.toLowerCase().endsWith('@bccsworld.com')) {
      return res.status(403).json({ message: 'License assignment requires a @bccsworld.com account' });
    }
    try {
      const orgId = req.params.id;
      const { plan, status, seatsLimit, currentPeriodEnd, notes } = req.body;

      const validPlans = ['trial', 'standard', 'professional', 'enterprise'];
      const validStatuses = ['active', 'trial', 'suspended', 'expired'];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: `Plan must be one of: ${validPlans.join(', ')}` });
      }
      const effectiveStatus = status || 'active';
      if (!validStatuses.includes(effectiveStatus)) {
        return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
      }
      const seats = Number.isFinite(parseInt(seatsLimit, 10)) ? parseInt(seatsLimit, 10) : 5;
      const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
      if (currentPeriodEnd && isNaN(periodEnd!.getTime())) {
        return res.status(400).json({ message: 'currentPeriodEnd is not a valid date' });
      }

      const orgResult = await db.execute(drizzleSql`
        SELECT id, organization_name FROM training_organizations WHERE id = ${orgId}
      `);
      const org = (orgResult as any).rows?.[0];
      if (!org) return res.status(404).json({ message: 'Organization not found' });

      const existingResult = await db.execute(drizzleSql`
        SELECT id FROM bccs_licenses WHERE organization_id = ${orgId} ORDER BY updated_at DESC LIMIT 1
      `);
      const existing = (existingResult as any).rows?.[0];

      let licenseRow: any;
      if (existing) {
        const updated = await db.execute(drizzleSql`
          UPDATE bccs_licenses SET
            plan = ${plan},
            status = ${effectiveStatus},
            seats_limit = ${seats},
            current_period_start = COALESCE(current_period_start, NOW()),
            current_period_end = ${periodEnd},
            assigned_by = ${email},
            notes = ${notes ?? null},
            updated_at = NOW()
          WHERE id = ${existing.id}
          RETURNING *
        `);
        licenseRow = (updated as any).rows?.[0];
      } else {
        const inserted = await db.execute(drizzleSql`
          INSERT INTO bccs_licenses
            (organization_id, plan, status, seats_limit, current_period_start, current_period_end, assigned_by, notes, updated_at)
          VALUES
            (${orgId}, ${plan}, ${effectiveStatus}, ${seats}, NOW(), ${periodEnd}, ${email}, ${notes ?? null}, NOW())
          RETURNING *
        `);
        licenseRow = (inserted as any).rows?.[0];
      }

      const { invalidateLicenseCache: invalidate } = await import('./middleware/license');
      invalidate();

      await storage.createAuditLog({
        userId: req.user?.id || 'system',
        eventType: 'license_assigned',
        message: `License assigned to ${org.organization_name}: ${plan} (${effectiveStatus}, ${seats} seats)`,
        details: { organizationId: orgId, plan, status: effectiveStatus, seatsLimit: seats },
        severity: 'info',
      }).catch((err) => console.error('License audit log failed (non-fatal):', err));

      res.json(licenseRow);
    } catch (error: any) {
      console.error('Org license assignment error:', error);
      res.status(500).json({ message: 'Failed to assign license' });
    }
  });

  // ── STRIPE PAYMENT ROUTES ────────────────────────────────────────────────────

  // GET /api/stripe/products — list products with prices (fetched directly from Stripe API)
  app.get('/api/stripe/products', async (_req, res) => {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const products = await stripe.products.list({ active: true, limit: 20 });
      const result: any[] = [];

      for (const product of products.data) {
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
        result.push({
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: prices.data.map((p) => ({
            id: p.id,
            unit_amount: p.unit_amount,
            currency: p.currency,
            recurring: p.recurring,
            metadata: p.metadata,
          })),
        });
      }

      // Sort by unit_amount of first price so Standard < Professional < Enterprise
      result.sort((a, b) => (a.prices[0]?.unit_amount ?? 0) - (b.prices[0]?.unit_amount ?? 0));
      res.json(result);
    } catch (error: any) {
      console.warn('Stripe products fetch:', error.message?.slice(0, 80));
      res.json([]);
    }
  });

  // POST /api/stripe/checkout — create checkout session
  app.post('/api/stripe/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const { priceId } = req.body;
      if (!priceId) return res.status(400).json({ message: 'priceId required' });

      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      // Get or create Stripe customer on the user row
      const userResult = await db.execute(drizzleSql`SELECT * FROM users WHERE id = ${req.user.id}`);
      const userRow = userResult.rows[0] as any;
      let customerId = userRow?.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          metadata: { userId: req.user.id },
        });
        customerId = customer.id;
        await db.execute(drizzleSql`UPDATE users SET stripe_customer_id = ${customerId} WHERE id = ${req.user.id}`);
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/billing?success=1`,
        cancel_url: `${baseUrl}/pricing`,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ message: error.message ?? 'Checkout failed' });
    }
  });

  // POST /api/stripe/portal — create customer portal session
  app.post('/api/stripe/portal', isAuthenticated, async (req: any, res) => {
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      const stripe = await getUncachableStripeClient();

      const userResult = await db.execute(drizzleSql`SELECT stripe_customer_id FROM users WHERE id = ${req.user.id}`);
      const customerId = (userResult.rows[0] as any)?.stripe_customer_id;
      if (!customerId) return res.status(404).json({ message: 'No Stripe customer found for this user' });

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/billing`,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal error:', error);
      res.status(500).json({ message: error.message ?? 'Failed to open billing portal' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}