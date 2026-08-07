---
name: Typecheck & completion-review standards
description: What the completion code review rejects when fixing type errors in this project
---

The project-wide `npx tsc --noEmit` must stay at 0 errors (restored Aug 2026, target ES2022 — do not revert).

**Rule:** Type errors here usually flag real contract breaks; fix behavior, don't suppress.
**Why:** Completion review repeatedly rejected suppression-style fixes: casting a fetch `Response` to a payload type instead of `await res.json()`, `(storage as any)` for methods that no longer exist, unreachable code after retirement throws, and new endpoints that skip the `isAuthenticated` + `requireOrg`/`req.orgId` tenant model or write deterministic filenames that later generations overwrite.
**How to apply:** When touching typing around API calls, parse and type the JSON; when a storage/schema domain is gone, either implement a real typed method on an existing table or explicitly retire the public surface (clear error/501), with no dead code left; new tenant routes must derive org solely from `req.orgId`; persisted generated files need collision-resistant names.
