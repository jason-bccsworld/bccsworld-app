---
name: PGlite for raw-SQL sweep tests
description: How to test services that run raw drizzle sql`` against Postgres without mocking the query
---

Rule: when a test must lock in behavior that lives in the SQL itself (window filters, NOT EXISTS dedupe, date-kind expressions), do NOT pattern-match the query text in a db mock — run the real SQL against an in-process PGlite Postgres (`@electric-sql/pglite` dev dep + `drizzle-orm/pglite`), mocking `../db` to return that drizzle instance and seeding only the tables the query touches.

**Why:** completion review rejected a mock-router version of the expiry-monitor tests because regressions in the actual SQL predicates would still pass; PGlite makes the tests fail when the query changes.

**How to apply:** vi.hoisted async factory builds the PGlite client, `vi.mock("../../db")` awaits it; create production-shaped tables (matching column types/casts like `organization_id::text`) in beforeAll; keep external side effects (email senders) mocked.
