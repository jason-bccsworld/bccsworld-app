---
name: Vercel serverless deployment & PDF extraction
description: Quirks of the app's Vercel production deployment — prebuilt api/_server.mjs, deploy latency, and PDF text extraction without poppler.
---

- Production (app.bccsworld.com) runs on Vercel serverless, not Replit deployments. `api/_server.mjs` is a **committed prebuilt esbuild bundle**; any server change must be rebuilt (`npx esbuild server/app.ts --bundle --platform=node --target=node20 --format=esm --outfile=api/_server.mjs --packages=external`) and committed, or prod may serve stale code.
- **Why:** the deployed function traces from the committed bundle; pushing source-only changes left prod on old behavior.
- Never hand-merge the generated bundle: on any merge conflict, take the current branch's copy and rebuild from merged sources. Note `merge=ours` in .gitattributes only works when `merge.ours.driver=true` is set in git config — a fresh clone lacks it.
- `/api/healthz` returns a `version` marker from `api/index.ts` — bump it per push to verify which build is live. Deploys from GitHub pushes land in ~1.5–5 min.
- Vercel "Redeploy" rebuilds the *same old commit*; a new deployment from latest main is needed to pick up pushes.
- Poppler tools (`pdftotext`/`pdftoppm`) do not exist on Vercel. PDF extraction falls back to `pdf-parse` (pdfjs), which requires: (1) polyfilling `DOMMatrix`/`ImageData`/`Path2D` before import, (2) `includeFiles: "node_modules/pdfjs-dist/legacy/build/**"` in vercel.json so the fake-worker module is packaged. A top-level static import of pdf-parse crashed every function cold start — keep it a guarded dynamic import.
- Vercel functions have a 30s `maxDuration`; the largest checklist area's AI review can time out on cold start (succeeds on retry).
- Prod shares the Neon DB with dev, so prod verification can be scripted: create a temp admin user (bcryptjs hash) + `user_organizations` row, log in with curl, exercise the API, then delete the user. Membership lookups are cached ~30s server-side.
