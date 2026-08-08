---
name: Vercel serverless deployment & PDF extraction
description: Quirks of the app's Vercel production deployment — prebuilt api/_server.mjs, deploy latency, and PDF text extraction without poppler.
---

- Production (app.bccsworld.com) runs on Vercel serverless, not Replit deployments. `api/_server.mjs` is a **generated, gitignored** esbuild bundle rebuilt by vercel.json's buildCommand on every deploy — it must never be committed or hand-merged.
- **Why:** it was once committed and prod served stale code when only sources were pushed; now the buildCommand rebuild is the single source of truth. After any deploy-pipeline change, verify via the `/api/healthz` version marker that the fresh bundle is live.
- `/api/healthz` returns a `version` marker from `api/index.ts` — bump it per push to verify which build is live. Deploys from GitHub pushes land in ~1.5–5 min.
- Vercel "Redeploy" rebuilds the *same old commit*; a new deployment from latest main is needed to pick up pushes.
- **No external binaries at all on Vercel** — any `execAsync` shell-out (`unzip`, poppler, etc.) fails with "command not found" in prod while working fine in dev. `.docx` extraction and the xlsx zip-bomb guard now use in-process jszip for this reason; audit new code for shell-outs before shipping.
- Scanned (image-only) PDFs: rasterize in-process via pdf-parse `getScreenshot` (uses `@napi-rs/canvas`, already a dep) then OCR with tesseract.js — never shell out to `pdftoppm`. tesseract needs `cachePath: os.tmpdir()` (cwd is read-only in prod) and downloads eng.traineddata at runtime. Cap pages + wall time to stay under the 30s function limit. `@napi-rs/canvas*`, `tesseract.js`, `tesseract.js-core` must be in vercel.json includeFiles.
- pdf-parse `getText` emits `-- N of M --` page separators even for image-only pages — strip them before deciding whether a PDF "has text", or scanned PDFs never reach OCR.
- Poppler tools (`pdftotext`/`pdftoppm`) do not exist on Vercel. PDF extraction falls back to `pdf-parse` (pdfjs), which requires: (1) polyfilling `DOMMatrix`/`ImageData`/`Path2D` before import, (2) `includeFiles: "node_modules/pdfjs-dist/legacy/build/**"` in vercel.json so the fake-worker module is packaged. A top-level static import of pdf-parse crashed every function cold start — keep it a guarded dynamic import.
- Vercel functions have a 30s `maxDuration`; the largest checklist area's AI review can time out on cold start (succeeds on retry).
- Prod shares the Neon DB with dev, so prod verification can be scripted: create a temp admin user (bcryptjs hash) + `user_organizations` row, log in with curl, exercise the API, then delete the user. Membership lookups are cached ~30s server-side.
