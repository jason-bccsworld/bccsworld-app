---
name: Neon cloud DB migrations
description: How schema changes must be applied in this project (Neon runtime DB, additive DDL, drift risk)
---

The app's runtime database is Neon cloud (`NEON_DATABASE_URL`), not the local Replit Postgres.

**Rule:** Never run `db:push` / drizzle-kit push. Apply schema changes as additive, idempotent DDL inside `server/db-init.ts` (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), each statement wrapped so one failure can't abort the rest.

**Why:** `db:push` against Neon risks destructive prompts/drops on a live cloud DB, and the local DB is not the source of truth. Tables have drifted before — a table existed in `shared/schema.ts` (and possibly the local DB) but was missing on Neon, and a single failed ALTER aborted the whole migration block, leaving later columns missing at runtime.

**How to apply:** When adding tables/columns, add the DDL to db-init with per-statement try/catch, restart the workflow, and verify against Neon directly (node + `@neondatabase/serverless` Pool + ws, query `pg_tables`/`information_schema`). Don't assume a table exists on Neon just because it's in schema.ts.
