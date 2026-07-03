---
name: Environment quirks (BCCS-US)
description: Non-obvious environment/tooling facts for the BCCS-US repl that cost debugging cycles.
---

# BCCS-US environment quirks

- **Runtime DB is Neon cloud via `NEON_DATABASE_URL`, not `DATABASE_URL`.** The app logs `[db] Connecting to Neon (cloud)`. When debugging with `psql`, use `psql "$NEON_DATABASE_URL"` — querying `$DATABASE_URL` shows a *different* (local) database where the app's tables won't exist, giving false "relation does not exist" errors.
  **How to apply:** any raw psql/DB inspection of live app data must target `NEON_DATABASE_URL`.

- **No `python3` in the shell.** Use `node -e` for JSON parsing / scripting in bash (e.g. piping curl output through a small node reader).

- **Never run `db:push`.** Schema changes go in `server/db-init.ts` using `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, executed on boot via `ensureTables()`.

- **New feature backends follow the reviewer.ts pattern**, not the `server/storage.ts` IStorage interface: a `server/routes/<feature>.ts` Router using raw `db.execute(sql\`...\`)`, mounted in `server/routes.ts`.

- **`apiRequest()` (client) returns `Promise<Response>`** — must call `.json()` on the result.
