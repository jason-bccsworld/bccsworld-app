import { db } from "./db";
import { sql } from "drizzle-orm";
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from "../shared/permissions";
import { ensureCryptoTables } from "./services/crypto-signing";

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

    console.log('[db-init] Training records tables ensured');
    console.log('[db-init] Role permissions seeded');
  } catch (err) {
    console.error('[db-init] Table creation error:', err);
  }
}
