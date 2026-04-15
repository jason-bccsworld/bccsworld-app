import { db } from "./db";
import { sql } from "drizzle-orm";

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

    console.log('[db-init] Training records tables ensured');
  } catch (err) {
    console.error('[db-init] Table creation error:', err);
  }
}
