import { db } from "./db";
import { sql } from "drizzle-orm";
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from "../shared/permissions";
import { ensureCryptoTables, getOrgActiveKey, generateAndStoreOrgKeyPair, signTrainingRecord } from "./services/crypto-signing";

export async function ensureTables(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_training_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        student_name VARCHAR(200) NOT NULL,
        student_id VARCHAR(100),
        instructor_name VARCHAR(200) NOT NULL,
        instructor_id VARCHAR(100),
        event_type VARCHAR(100) NOT NULL,
        event_date TIMESTAMP NOT NULL,
        duration_hours VARCHAR(20),
        curriculum_item VARCHAR(500),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'completed',
        blockchain_hash VARCHAR(200),
        user_id VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(200),
        phone VARCHAR(50),
        certificate_number VARCHAR(100),
        enrollment_date TIMESTAMP DEFAULT NOW(),
        expected_completion TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_instructor_records (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(200),
        certificate_type VARCHAR(100) NOT NULL,
        certificate_number VARCHAR(100) NOT NULL,
        issue_date TIMESTAMP,
        expiration_date TIMESTAMP,
        currency_date TIMESTAMP,
        ratings JSONB,
        training_authorizations JSONB,
        status VARCHAR(50) DEFAULT 'current',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add new user columns if they don't exist
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
    `);

    // Role permissions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_role_permissions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        role_name VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
        is_system BOOLEAN DEFAULT FALSE,
        color VARCHAR(80) DEFAULT 'bg-gray-100 text-gray-700',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed default roles if they don't exist
    for (const role of SYSTEM_ROLES) {
      const perms = DEFAULT_ROLE_PERMISSIONS[role.roleName] ?? [];
      // Build a safe array literal: ARRAY['perm1','perm2',...]
      const arrayLiteral = perms.length > 0
        ? `ARRAY[${perms.map(p => `'${p.replace(/'/g, "''")}'`).join(",")}]::TEXT[]`
        : `ARRAY[]::TEXT[]`;
      await db.execute(sql.raw(`
        INSERT INTO bccs_role_permissions (role_name, display_name, description, permissions, is_system, color)
        VALUES (
          '${role.roleName.replace(/'/g, "''")}',
          '${role.displayName.replace(/'/g, "''")}',
          '${(role.description || "").replace(/'/g, "''")}',
          ${arrayLiteral},
          ${role.isSystem ? "TRUE" : "FALSE"},
          '${role.color.replace(/'/g, "''")}'
        )
        ON CONFLICT (role_name) DO NOTHING
      `));
    }

    // ── Licenses table ────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_licenses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        plan VARCHAR(50) NOT NULL DEFAULT 'trial',
        status VARCHAR(50) NOT NULL DEFAULT 'trial',
        stripe_customer_id VARCHAR(200),
        stripe_subscription_id VARCHAR(200),
        stripe_price_id VARCHAR(200),
        seats_limit INTEGER NOT NULL DEFAULT 5,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        assigned_by VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Per-organization license assignment (NULL = platform-wide/default license)
    await db.execute(sql`
      ALTER TABLE bccs_licenses ADD COLUMN IF NOT EXISTS organization_id UUID
    `);

    // Seed a trial license if none exists
    const licenseCount = await db.execute(sql`SELECT COUNT(*) FROM bccs_licenses`);
    const count = parseInt((licenseCount.rows[0] as any).count, 10);
    if (count === 0) {
      await db.execute(sql`
        INSERT INTO bccs_licenses (plan, status, seats_limit, current_period_start, current_period_end, notes)
        VALUES (
          'trial', 'trial', 5,
          NOW(),
          NOW() + INTERVAL '30 days',
          'Auto-created 30-day trial license'
        )
      `);
      console.log('[db-init] Trial license seeded');
    }

    // ── Stripe columns on users ───────────────────────────────────────────────
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(200)
    `);
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(200)
    `);

    // ── Support Admin role ────────────────────────────────────────────────────
    await db.execute(sql.raw(`
      INSERT INTO bccs_role_permissions (role_name, display_name, description, permissions, is_system, color)
      VALUES (
        'support_admin',
        'Support Admin',
        'BCCS support staff — can manage licenses and assist clients',
        ARRAY['manage_licenses','view_users','view_compliance_records','view_audit_logs']::TEXT[],
        TRUE,
        'bg-purple-100 text-purple-700'
      )
      ON CONFLICT (role_name) DO NOTHING
    `));

    // Crypto signing tables (Ed25519 key pairs + signature columns)
    await ensureCryptoTables();

    // ── Reviewer API keys ─────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_reviewer_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_hash VARCHAR(64) NOT NULL UNIQUE,
        key_preview VARCHAR(24) NOT NULL,
        label VARCHAR(200) NOT NULL,
        reviewer_name VARCHAR(200) NOT NULL,
        reviewer_email VARCHAR(300),
        org_ids JSONB NOT NULL DEFAULT '[]',
        created_by VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // ── AIEOS / GATE governance engine ──────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS governance_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type VARCHAR(100) NOT NULL UNIQUE,
        label VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        required_authority VARCHAR(50) NOT NULL,
        decision_rule VARCHAR(20) NOT NULL DEFAULT 'refuse',
        is_protected BOOLEAN DEFAULT FALSE,
        regulatory_basis VARCHAR(200) NOT NULL,
        regulatory_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS governance_decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type VARCHAR(100) NOT NULL,
        action_description TEXT NOT NULL,
        requested_by VARCHAR(200) NOT NULL,
        requester_authority VARCHAR(50) NOT NULL,
        policy_id UUID REFERENCES governance_policies(id),
        decision VARCHAR(20) NOT NULL,
        reasoning TEXT NOT NULL,
        regulatory_basis VARCHAR(200),
        org_id VARCHAR(200),
        context JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS governance_escalations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        decision_id UUID REFERENCES governance_decisions(id) NOT NULL,
        required_approver_role VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        requested_by VARCHAR(200) NOT NULL,
        approved_by VARCHAR(200),
        resolution_note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_name VARCHAR(100) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        related_event_id UUID,
        org_id VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ── Multi-tenant foundation ──────────────────────────────────────────────
    // 0) checklist_states may not exist yet on fresh/cloud databases
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS checklist_states (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        state JSONB NOT NULL,
        organization_id UUID,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Migrate legacy uniqueness (one row per user globally) to per-org
    // uniqueness so a user's checklist in one org never overwrites another.
    await db.execute(sql`ALTER TABLE checklist_states DROP CONSTRAINT IF EXISTS checklist_states_user_id_key`);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS checklist_states_user_org_key
      ON checklist_states (user_id, organization_id)
    `);

    // 1) organization_id columns on all tenant-owned operational tables.
    //    Each ALTER runs independently so one missing table can't abort the rest.
    const tenantTables = [
      'students',
      'bccs_instructor_records',
      'bccs_training_events',
      'checklist_states',
      'digital_form_templates',
      'digital_form_submissions',
      'audit_logs',
      'compliance_checks',
    ];
    for (const table of tenantTables) {
      try {
        await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS organization_id UUID`));
      } catch (err: any) {
        console.error(`[db-init] Could not add organization_id to ${table} (non-fatal):`, err?.message ?? err);
      }
    }

    // 2) User ↔ organization membership table (per-org roles)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL,
        organization_id UUID NOT NULL,
        org_role VARCHAR(50) NOT NULL DEFAULT 'viewer',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, organization_id)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_user_org_user" ON user_organizations (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_user_org_org" ON user_organizations (organization_id)`);

    // 3) Backfill: attach existing data + users to the default (earliest active) org.
    //    Idempotent — only touches rows that have no organization yet.
    //    Single-workspace mode: runs every boot (one org, no ambiguity).
    //    Multi-tenant mode: runs exactly ONCE (migration flag) so pre-existing
    //    data is deterministically attached at rollout, but rows created later
    //    are never silently reassigned to the default org.
    const multiTenantMode = process.env.MULTI_TENANT === 'true';
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_migration_flags (
        key VARCHAR PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const defaultOrgResult = await db.execute(sql`
      SELECT id FROM training_organizations
      WHERE is_active = TRUE
      ORDER BY created_at ASC
      LIMIT 1
    `);
    const defaultOrgId = (defaultOrgResult.rows[0] as any)?.id as string | undefined;
    let runBackfill = !!defaultOrgId;
    if (runBackfill && multiTenantMode) {
      const flag = await db.execute(sql`SELECT 1 FROM bccs_migration_flags WHERE key = 'tenant_backfill_v1'`);
      runBackfill = flag.rows.length === 0;
    }
    if (runBackfill && defaultOrgId) {
      for (const table of tenantTables) {
        await db.execute(sql.raw(
          `UPDATE ${table} SET organization_id = '${defaultOrgId}' WHERE organization_id IS NULL`
        ));
      }
      // Governance tables use org_id (VARCHAR). Attach legacy/seed rows
      // (NULL or the pre-tenant demo marker) to the default org so scoped
      // reads keep serving them in single-workspace mode.
      for (const table of ['governance_decisions', 'agent_events']) {
        await db.execute(sql.raw(
          `UPDATE ${table} SET org_id = '${defaultOrgId}' WHERE org_id IS NULL OR org_id = 'demo-org-142'`
        ));
      }
      await db.execute(sql`
        INSERT INTO user_organizations (user_id, organization_id, org_role)
        SELECT u.id, ${defaultOrgId}::uuid, COALESCE(u.role, 'viewer')
        FROM users u
        WHERE NOT EXISTS (
          SELECT 1 FROM user_organizations uo WHERE uo.user_id = u.id
        )
        ON CONFLICT (user_id, organization_id) DO NOTHING
      `);
      if (multiTenantMode) {
        await db.execute(sql`INSERT INTO bccs_migration_flags (key) VALUES ('tenant_backfill_v1') ON CONFLICT (key) DO NOTHING`);
      }
      console.log('[db-init] Multi-tenant backfill complete (default org:', defaultOrgId + ')');
    } else if (!defaultOrgId) {
      console.log('[db-init] Multi-tenant backfill skipped — no active organization yet');
    } else {
      console.log('[db-init] Multi-tenant one-time backfill already applied');
    }

    // Seed governance demo data (policies, prior decisions, agent activity)
    await seedGovernanceData();

    console.log('[db-init] Training records tables ensured');
    console.log('[db-init] Role permissions seeded');
    console.log('[db-init] Governance (GATE/AIEOS) tables ensured');
  } catch (err) {
    console.error('[db-init] Table creation error:', err);
  }
}

// ── Governance seed data (AIEOS / GATE demo context) ─────────────────────────
const DEMO_ORG = "demo-org-142";

const SEED_POLICIES = [
  {
    action_type: "modify_evidence",
    label: "Modify audit evidence",
    description: "Alter or overwrite a document, extracted field, or evidence artifact already attached to a compliance record.",
    required_authority: "admin",
    decision_rule: "refuse",
    is_protected: true,
    regulatory_basis: "14 CFR 142.45",
    regulatory_text: "Each training center must maintain accurate records of each student and make them available. Evidence integrity is non-negotiable.",
  },
  {
    action_type: "delete_audit_record",
    label: "Delete an audit-trail record",
    description: "Permanently remove an entry from the immutable audit history.",
    required_authority: "faa_designated_examiner",
    decision_rule: "refuse",
    is_protected: true,
    regulatory_basis: "14 CFR 142.47",
    regulatory_text: "Records must be retained for the required retention period. Deletion of audit history is categorically inadmissible.",
  },
  {
    action_type: "issue_certificate_without_checkride",
    label: "Issue certificate without a completed checkride",
    description: "Grant a course-completion certificate to a student who has not passed the required practical test.",
    required_authority: "faa_designated_examiner",
    decision_rule: "refuse",
    is_protected: false,
    regulatory_basis: "14 CFR 61.43",
    regulatory_text: "Completion of a practical test is required before a certificate or rating may be issued.",
  },
  {
    action_type: "waive_required_training_hours",
    label: "Waive required training hours",
    description: "Reduce or waive the minimum training hours specified in the approved training program.",
    required_authority: "chief_pilot",
    decision_rule: "escalate",
    is_protected: false,
    regulatory_basis: "14 CFR 142.53",
    regulatory_text: "Training programs must meet the curriculum and hour requirements approved by the Administrator.",
  },
  {
    action_type: "sign_training_record_without_instructor",
    label: "Sign a training record without instructor verification",
    description: "Finalize a training record that is missing the required instructor signature.",
    required_authority: "instructor",
    decision_rule: "refuse",
    is_protected: false,
    regulatory_basis: "14 CFR 142.61",
    regulatory_text: "Training records must reflect instruction given and be signed by the authorized instructor.",
  },
  {
    action_type: "approve_checkride_extension",
    label: "Approve a checkride deadline extension",
    description: "Extend the allowable time window for a student to complete a required practical test.",
    required_authority: "chief_pilot",
    decision_rule: "escalate",
    is_protected: false,
    regulatory_basis: "14 CFR 142.59",
    regulatory_text: "Deviations from the approved training schedule require appropriate authority approval.",
  },
  {
    action_type: "modify_enrollment_after_completion",
    label: "Modify enrollment after course completion",
    description: "Change a student's enrollment or completion status after the course has been marked complete.",
    required_authority: "admin",
    decision_rule: "escalate",
    is_protected: true,
    regulatory_basis: "14 CFR 142.45",
    regulatory_text: "Completed-course records are protected. Post-completion changes require governance approval and full audit logging.",
  },
  {
    action_type: "export_compliance_data_external",
    label: "Export compliance data to an external party",
    description: "Send compliance records or evidence packages to a recipient outside the organization.",
    required_authority: "admin",
    decision_rule: "escalate",
    is_protected: false,
    regulatory_basis: "Data Governance Policy DG-04",
    regulatory_text: "External disclosure of compliance data requires documented authorization and an audit record.",
  },
  {
    action_type: "delete_signed_training_record",
    label: "Delete a signed (protected) training record",
    description: "Permanently remove a cryptographically signed training record from the compliance ledger.",
    required_authority: "faa_designated_examiner",
    decision_rule: "refuse",
    is_protected: true,
    regulatory_basis: "14 CFR 142.45",
    regulatory_text: "Signed training records are protected state. They may not be deleted at any authority level; corrections must be appended as a new, fully audited version.",
  },
  {
    action_type: "delete_training_record",
    label: "Delete an unsigned draft training record",
    description: "Remove a draft training record that has not yet been cryptographically signed.",
    required_authority: "admin",
    decision_rule: "escalate",
    is_protected: false,
    regulatory_basis: "14 CFR 142.45",
    regulatory_text: "Draft records may be removed, but deletion requires administrator authority and a documented audit record.",
  },
];

export async function resetGovernanceDemo(): Promise<void> {
  // Wipe runtime + seed rows and restore fresh seed state (for repeatable demos).
  await db.execute(sql`
    TRUNCATE governance_escalations, governance_decisions, agent_events RESTART IDENTITY CASCADE
  `);
  await db.execute(sql`DELETE FROM governance_policies`);
  await seedGovernanceData();

  // Rebuild the demo training records so runtime-governance demos always have the right
  // subjects: genuinely signed (protected) records the GATE must refuse to delete, plus one
  // unsigned draft the GATE is allowed to delete. Clear prior demo rows so resets stay idempotent.
  const DEMO_ORG = "bccs.us"; // matches resolveOrgId's fallback (login email domain) for the demo account
  await ensureCryptoTables();
  if (!(await getOrgActiveKey(DEMO_ORG))) {
    await generateAndStoreOrgKeyPair(DEMO_ORG);
  }

  // The unsigned draft is never part of the signature chain, so it is always safe to reset.
  await db.execute(sql`DELETE FROM bccs_training_events WHERE blockchain_hash = 'BCCS-DEMO-UNSIGNED-DRAFT'`);

  // Deleting a signed record breaks verification of any record signed AFTER it, because
  // verifyTrainingRecord re-derives prevChainHash from the previous row by signed_at (globally,
  // with no org/marker filter). So only tear down + reseed the demo signed rows when NO real
  // (non-demo) signed record exists that could have chained onto them. When real signed records
  // are present, leave existing demo rows intact and append fresh ones only if none exist —
  // appending at the end of the chain never disturbs earlier records.
  const realSigned = await db
    .execute(sql`SELECT COUNT(*)::int AS n FROM bccs_training_events
                 WHERE signature IS NOT NULL AND blockchain_hash IS DISTINCT FROM 'BCCS-DEMO-SIGNED'`)
    .then((r) => (r as any).rows[0]?.n ?? 0);
  if (realSigned === 0) {
    await db.execute(sql`DELETE FROM bccs_training_events WHERE blockchain_hash = 'BCCS-DEMO-SIGNED'`);
  }
  const demoSignedCount = await db
    .execute(sql`SELECT COUNT(*)::int AS n FROM bccs_training_events WHERE blockchain_hash = 'BCCS-DEMO-SIGNED'`)
    .then((r) => (r as any).rows[0]?.n ?? 0);

  // Signed, blockchain-protected records — subjects for the runtime-refusal / protected-state
  // demo AND real crypto-verified rows for the evidence package. Each is Ed25519-signed.
  const signedSeeds = [
    { student: "Alice Rivera", instructor: "Capt. James Holt", type: "flight", hours: 2.0,
      curriculum: "Part 142 — Simulator Session 4 (ILS approaches)" },
    { student: "Marcus Chen", instructor: "Capt. James Holt", type: "checkride", hours: 1.5,
      curriculum: "Part 142 — Type Rating Practical Test" },
  ];
  if (demoSignedCount === 0) {
    for (const s of signedSeeds) {
      const inserted = await db.execute(sql`
        INSERT INTO bccs_training_events
          (student_name, instructor_name, event_type, event_date, duration_hours, curriculum_item, notes, status, blockchain_hash, user_id)
        VALUES
          (${s.student}, ${s.instructor}, ${s.type}, NOW(), ${s.hours}, ${s.curriculum},
           'Signed, blockchain-protected record — protected state under 14 CFR 142.45.',
           'completed', 'BCCS-DEMO-SIGNED', 'system')
        RETURNING id
      `).then((r) => (r as any).rows);
      await signTrainingRecord(inserted[0].id, DEMO_ORG);
    }
  }

  // One unsigned draft — the GATE admits an admin's delete, and escalates a lower authority's.
  await db.execute(sql`
    INSERT INTO bccs_training_events
      (student_name, instructor_name, event_type, event_date, duration_hours, curriculum_item, notes, status, blockchain_hash, user_id)
    VALUES
      ('Demo Student (Draft)', 'Demo Instructor', 'ground', NOW(), 1.5,
       'Draft ground lesson — not yet signed',
       'Unsigned draft used to demonstrate that the GATE admits a permitted delete.',
       'pending', 'BCCS-DEMO-UNSIGNED-DRAFT', 'system')
  `);
}

export async function seedGovernanceData(): Promise<void> {
  // 1) Policies — always upsert (idempotent) so newly added policies land on existing
  // installs too, not just fresh databases. ON CONFLICT keeps this safe to run every boot.
  for (const p of SEED_POLICIES) {
    await db.execute(sql`
      INSERT INTO governance_policies
        (action_type, label, description, required_authority, decision_rule, is_protected, regulatory_basis, regulatory_text)
      VALUES
        (${p.action_type}, ${p.label}, ${p.description}, ${p.required_authority}, ${p.decision_rule},
         ${p.is_protected}, ${p.regulatory_basis}, ${p.regulatory_text})
      ON CONFLICT (action_type) DO NOTHING
    `);
  }

  // The demo decisions + agent feed carry timestamps and would duplicate on every boot,
  // so seed them only once — gate on whether any decisions already exist.
  const existing = await db
    .execute(sql`SELECT COUNT(*)::int AS n FROM governance_decisions`)
    .then((r) => (r as any).rows[0]?.n ?? 0);
  if (existing > 0) return;

  // Stamp seeds with the default (earliest active) org so org-scoped
  // governance reads serve them; fall back to the legacy demo marker
  // (backfill will reattach it once an org exists).
  const seedOrg = await db
    .execute(sql`SELECT id FROM training_organizations WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1`)
    .then((r) => ((r as any).rows[0]?.id as string | undefined) ?? DEMO_ORG);

  // Map action_type -> policy id for decision seeding
  const policyRows = await db
    .execute(sql`SELECT id, action_type, regulatory_basis FROM governance_policies`)
    .then((r) => (r as any).rows as any[]);
  const policyByAction: Record<string, any> = {};
  for (const row of policyRows) policyByAction[row.action_type] = row;

  // 2) Prior governance decisions (Enterprise Memory)
  const seedDecisions = [
    {
      action_type: "waive_required_training_hours",
      action_description: "Instructor requested waiving 4 simulator hours for student S-1042 citing prior military experience.",
      requested_by: "J. Alvarez (instructor)",
      requester_authority: "instructor",
      decision: "escalated",
      reasoning: "Authority insufficient: hour waivers require chief pilot authority under 14 CFR 142.53. Routed for human approval; approved with documented military logbook credit.",
      daysAgo: 34,
    },
    {
      action_type: "issue_certificate_without_checkride",
      action_description: "Attempt to issue Part 142 course completion for student S-0987 before practical test.",
      requested_by: "M. Chen (instructor)",
      requester_authority: "instructor",
      decision: "refused",
      reasoning: "Inadmissible under 14 CFR 61.43 — a practical test must be completed before a certificate is issued. No authority level can override this requirement.",
      daysAgo: 21,
    },
    {
      action_type: "modify_evidence",
      action_description: "Request to replace an uploaded curriculum PDF already linked to a compliance record.",
      requested_by: "K. Osei (auditor)",
      requester_authority: "auditor",
      decision: "refused",
      reasoning: "Evidence is protected state under 14 CFR 142.45. Overwriting attached evidence is refused; a new version must be appended with full audit trail instead.",
      daysAgo: 12,
    },
    {
      action_type: "approve_checkride_extension",
      action_description: "14-day checkride extension requested for student S-1103 due to weather cancellations.",
      requested_by: "R. Silva (instructor)",
      requester_authority: "instructor",
      decision: "escalated",
      reasoning: "Schedule deviation under 14 CFR 142.59 requires chief pilot authority. Escalated and approved with weather-cancellation documentation attached.",
      daysAgo: 6,
    },
    {
      action_type: "export_compliance_data_external",
      action_description: "Export of Q1 compliance package to a partner airline's training department.",
      requested_by: "T. Nakamura (admin)",
      requester_authority: "admin",
      decision: "allowed",
      reasoning: "Requester holds admin authority; external export authorized per DG-04 with an audit record generated and recipient logged.",
      daysAgo: 3,
    },
  ];

  for (const d of seedDecisions) {
    const pol = policyByAction[d.action_type];
    await db.execute(sql`
      INSERT INTO governance_decisions
        (action_type, action_description, requested_by, requester_authority, policy_id, decision, reasoning, regulatory_basis, org_id, created_at)
      VALUES
        (${d.action_type}, ${d.action_description}, ${d.requested_by}, ${d.requester_authority},
         ${pol?.id ?? null}, ${d.decision}, ${d.reasoning}, ${pol?.regulatory_basis ?? null}, ${seedOrg},
         NOW() - (${d.daysAgo} || ' days')::interval)
    `);
  }

  // 3) Agent activity feed (Shared Enterprise Awareness) — one detection propagating to peers
  const detection = await db
    .execute(sql`
      INSERT INTO agent_events (agent_name, event_type, message, org_id, created_at)
      VALUES ('Regulatory Watch Agent', 'detected_change',
        'Detected FAA update affecting 14 CFR 142.45 recordkeeping — new evidence-retention clause published.',
        ${seedOrg}, NOW() - interval '2 hours')
      RETURNING id
    `)
    .then((r) => (r as any).rows[0].id);

  const reactions = [
    ["Compliance Agent", "updated_checklist", "Updated 3 Part 142 checklist items to reference the revised 142.45 retention clause."],
    ["Records Agent", "flagged_records", "Flagged 7 training records and 2 evidence packages for retention-period review."],
    ["Governance Agent", "policy_synced", "Confirmed modify_evidence policy still enforces protected state under revised 142.45."],
    ["Dashboard", "dashboard_synced", "Enterprise compliance dashboard refreshed — audit readiness recalculated."],
  ];
  for (const [agent, type, msg] of reactions) {
    await db.execute(sql`
      INSERT INTO agent_events (agent_name, event_type, message, related_event_id, org_id, created_at)
      VALUES (${agent}, ${type}, ${msg}, ${detection}, ${seedOrg}, NOW() - interval '1 hour')
    `);
  }

  console.log('[db-init] Governance demo data seeded');
}
