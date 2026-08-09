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

## Timeout resilience (Aug 2026)
- Map phase uses gpt-4o-mini (quote extraction only); reduce keeps gpt-4o for verdicts. gpt-4o map calls routinely blew the 25s budget on 35-item areas.
- Map uses Promise.allSettled: persist only the consecutive successful prefix; all-fail returns 502 {retryable:true}; client retries same segment up to 3x.
- Segment 0 with an existing incomplete same-hash run RESUMES (returns nextSegment=segments_done) instead of resetting — re-clicks must not rescan finished sections.
