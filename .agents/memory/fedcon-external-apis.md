---
name: Federal contract data APIs
description: Quirks of USAspending.gov and SAM.gov feeding the Federal Contracts Monitor agent
---
- USAspending `spending_by_award` returns `NAICS` as an object `{code, description}`, not a string — coerce before inserting into VARCHAR columns (an uncoerced insert overflowed varchar(50) and failed the whole patrol run).
- USAspending is fully public; SAM.gov opportunities + exclusions need `SAM_GOV_API_KEY`. When the key is missing, checks must be *reported as skipped* in the run summary, never silently dropped — that's the agreed contract with the user.
- Risk scoring must stay deterministic in code (point-weighted rubric, veto flags force Critical); the LLM only condenses notice text into dossier fields.
- **Why:** distilled from the uploaded due-diligence checklist docs; scoring drift via LLM would make tiers non-reproducible.

## Attachment downloads redirect off sam.gov
sam.gov attachment download endpoints 303-redirect to short-lived presigned URLs on official S3 buckets (iae-fbo-attachments.s3.amazonaws.com, falextracts.s3.amazonaws.com). Trust those exact hosts as *redirect targets only* — never as initial URLs, and never append the SAM API key to them. Filenames come from the S3 Content-Disposition header, not the URL.
