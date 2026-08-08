---
name: Full-coverage map-reduce AI review
description: Design constraints for the checklist AI review that scans the entire manual set under serverless limits
---

The checklist AI review scans 100% of the manual text via a client-driven map-reduce: the browser loops `map` (segment windows) then `reduce` (one item batch per request, then a DB-only finalize request). No single request may combine a long AI call with the full persistence write set.

**Why:** Vercel kills functions at 30s; earlier single-request designs truncated to ~18k chars or timed out. A paying customer's 377k-char manual is the sizing case.

**How to apply:**
- All run state (evidence, progress, verdicts) is server-owned in `bccs_checklist_review_runs` — never trust client-carried evidence, or "full coverage" can be fabricated.
- Runs are bound to a combined hash of manual ids + checklist item ids; import/reset deletes runs. Any mid-run change → 409 "restart".
- Segments must be scanned sequentially; all state transitions use conditional UPDATE/DELETE ... RETURNING (compare expected progress + hash) so concurrent/duplicate requests can't clobber each other.
- OpenAI calls on these endpoints: timeout 25s, maxRetries 0.
- Run-table SQL is covered by a PGlite test (real jsonb round-trips), not mock-routed.
