import { db } from "./db";
import { sql } from "drizzle-orm";
import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLES } from "../shared/permissions";

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

    console.log('[db-init] Training records tables ensured');
    console.log('[db-init] Role permissions seeded');
  } catch (err) {
    console.error('[db-init] Table creation error:', err);
  }
}
