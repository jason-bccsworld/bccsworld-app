import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import {
  generateAndStoreOrgKeyPair,
  getOrgActiveKey,
  signTrainingRecord,
  verifyTrainingRecord,
  signAllUnsignedRecords,
  exportPublicKeyPem,
  computeFingerprint,
} from "../services/crypto-signing";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isPlatformStaff, getUserMemberships } from "../middleware/tenant";

const router = Router();

// Helper: resolve the org identifier for the current user's org
async function resolveOrgId(req: any): Promise<string> {
  // Try the user's organization from the DB
  const user = req.user as any;
  const orgRows = await db.execute(sql`
    SELECT id, organization_name, certificate_number FROM training_organizations
    WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1
  `).then(r => (r as any).rows);
  if (orgRows[0]) return orgRows[0].id;
  // Fall back to user email domain as org identifier
  return user?.email?.split("@")[1] ?? "default-org";
}

// POST /api/org-keys/generate — generate Ed25519 key pair for the organization
router.post("/generate", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const result = await generateAndStoreOrgKeyPair(orgId);
    res.json({
      success: true,
      algorithm: result.algorithm,
      fingerprint: result.fingerprint,
      publicKeyPem: result.publicKeyPem,
      createdAt: result.createdAt,
      message: "Ed25519 key pair generated. Private key is encrypted and stored server-side.",
    });
  } catch (err: any) {
    console.error("Key generation error:", err);
    res.status(500).json({ message: err.message || "Key generation failed" });
  }
});

// GET /api/org-keys/current — get the active org key (public only)
router.get("/current", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const key = await getOrgActiveKey(orgId);
    if (!key) {
      return res.json({ hasKey: false, message: "No key generated yet" });
    }
    res.json({
      hasKey: true,
      fingerprint: key.key_fingerprint,
      algorithm: key.algorithm,
      publicKeyPem: key.public_key_pem,
      createdAt: key.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch key" });
  }
});

// GET /api/org-keys/public-key — download public key as PEM file
router.get("/public-key", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const pem = await exportPublicKeyPem(orgId);
    if (!pem) return res.status(404).json({ message: "No key found" });
    res.setHeader("Content-Type", "application/x-pem-file");
    res.setHeader("Content-Disposition", `attachment; filename="bccs-org-public-key.pem"`);
    res.send(pem);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/org-keys/sign/:eventId — sign a single training record
router.post("/sign/:eventId", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const result = await signTrainingRecord(req.params.eventId, orgId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Sign record error:", err);
    res.status(500).json({ message: err.message || "Signing failed" });
  }
});

// POST /api/org-keys/sign-all — sign all unsigned records
router.post("/sign-all", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = await resolveOrgId(req);
    const result = await signAllUnsignedRecords(orgId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Bulk signing failed" });
  }
});

// GET /api/org-keys/verify/:eventId — verify a record's cryptographic signature
router.get("/verify/:eventId", async (req, res) => {
  // Verification is intentionally public — anyone with the event ID can verify
  try {
    const result = await verifyTrainingRecord(req.params.eventId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Verification failed" });
  }
});

// GET /api/org-keys/chain — get signed records forming the chain
router.get("/chain", isAuthenticated, async (req: any, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT id, student_name, instructor_name, event_type, event_date,
             status, key_fingerprint, signed_data_hash, chain_hash, signed_at,
             signature
      FROM bccs_training_events
      WHERE signature IS NOT NULL
      ORDER BY signed_at ASC
    `).then(r => (r as any).rows);

    res.json({
      chainLength: rows.length,
      records: rows.map((r: any, i: number) => ({
        index: i + 1,
        id: r.id,
        studentName: r.student_name,
        instructorName: r.instructor_name,
        eventType: r.event_type,
        eventDate: r.event_date,
        status: r.status,
        keyFingerprint: r.key_fingerprint,
        signedDataHash: r.signed_data_hash,
        chainHash: r.chain_hash,
        signedAt: r.signed_at,
        signaturePreview: r.signature ? r.signature.slice(0, 16) + "..." : null,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to fetch chain" });
  }
});

// POST /api/org-keys/generate-for-org — generate key for a specific org (org setup flow)
// Only platform staff or an admin member of that organization may (re)generate its key.
router.post("/generate-for-org", isAuthenticated, async (req: any, res) => {
  try {
    const { orgId } = req.body;
    if (!orgId) return res.status(400).json({ message: "orgId required" });
    if (!isPlatformStaff(req.user?.email)) {
      const memberships = await getUserMemberships(req.user.id);
      const membership = memberships.find((m) => m.organizationId === orgId);
      const isOrgAdmin = membership && membership.orgRole === "admin";
      if (!isOrgAdmin) {
        return res.status(403).json({ message: "Only an admin of this organization can generate its signing keys" });
      }
    }
    const result = await generateAndStoreOrgKeyPair(orgId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Key generation failed" });
  }
});

export default router;
