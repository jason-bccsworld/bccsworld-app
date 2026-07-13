---
name: Dev environment quirks
description: Gotchas when testing this app locally — which database is live, and SPA catch-all masking 404s.
---

# Runtime database is Neon, not the local DATABASE_URL

The app connects via `NEON_DATABASE_URL || DATABASE_URL` (see server/db.ts). Both env vars exist, so the app runs on Neon while plain `psql "$DATABASE_URL"` hits a *different* local database with a stale schema.

**Why:** Seeding/inspecting test data via `psql "$DATABASE_URL"` fails with "column does not exist" errors even though the app works fine — the two databases have diverged schemas.

**How to apply:** Always use `psql "$NEON_DATABASE_URL"` for any manual SQL against the running app's data. Never run `db:push` against the Neon runtime DB.

# SPA catch-all returns 200 for unmatched API methods

Requests to `/api/...` paths with a method that has no registered Express route (e.g. PATCH where only PUT exists) fall through to the Vite/SPA catch-all and return **200 with HTML**, not 404.

**Why:** During security testing, a cross-org PATCH appeared to "succeed" (200) but was actually the SPA fallback; the database row was untouched.

**How to apply:** When curl-testing API endpoints, confirm the real route method first (grep the router), and treat a 200 with HTML body as "no such route", not success.

# Bash-spawned servers die between invocations

Any server started in a bash tool call is killed when that invocation ends — a follow-up curl in a new invocation hits a dead port.

**Why:** E2E-testing a temp server (`npx tsx server/index.ts` on a spare port) only worked when start, curl checks, and kill were chained in ONE bash command.

**How to apply:** For temp-server E2E tests, do `start & sleep, curl..., kill` in a single invocation. For the dev workflow, code edits don't hot-reload the tsx server — call restart_workflow explicitly before re-testing.
