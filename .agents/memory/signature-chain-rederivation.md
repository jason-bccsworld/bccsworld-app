---
name: Signature chain re-derivation constraint
description: Why deleting any signed training record can break verification of later records, and how demo-reset guards against it.
---

# Ed25519 training-record signature chain — deletion is destructive to later records

The crypto-signing service chains signed training records: each record's `chain_hash`
folds in the previous signed record's `chain_hash`. **`verifyTrainingRecord` re-derives the
previous hash at verify time by selecting the signed row with the greatest `signed_at`
STRICTLY BEFORE the record being verified — globally, with NO org or marker filter.**

**Rule:** Deleting a signed record breaks signature verification of every record signed
*after* it (their re-derived `prevChainHash` changes → "data hash mismatch / tampered").
Appending new signed records at the end of the chain is always safe; deleting or
re-signing an earlier one is not.

**Why:** The governance demo-reset seeds throwaway signed records (`blockchain_hash =
'BCCS-DEMO-SIGNED'`) and tears them down on each reset. If a user signs a *real* record
between resets, that real record chains onto a demo row; the next reset's delete would
silently invalidate the real record — a live foot-gun during a CTO demo. Surfaced by
architect review of the runtime-governance Phase 3 work.

**How to apply:** Any code that deletes/reseeds signed records must first check whether a
non-demo signed record exists (`signature IS NOT NULL AND blockchain_hash IS DISTINCT FROM
'BCCS-DEMO-SIGNED'`). If real signed records exist, do NOT delete existing demo signed rows —
only append fresh ones when none exist (append never disturbs earlier rows). The unsigned
draft is not part of the chain and is always safe to reset. This same caution applies to
any future bulk delete/re-sign feature over `bccs_training_events`.
