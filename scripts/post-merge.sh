#!/bin/bash
# Post-merge setup: runs automatically after a task branch is merged.
# Keep idempotent, non-interactive, and fast.
set -e

# Sync dependencies with the merged package.json / package-lock.json.
npm install --no-audit --no-fund

# Schema changes are applied automatically at boot by server/db-init.ts
# (additive DDL against the Neon cloud DB) — no migration step needed here.

# --- Generated Vercel production bundle (api/_server.mjs) ------------------
# .gitattributes marks it merge=ours; that built-in-looking name still needs a
# driver definition in git config, so install it here (idempotent) so every
# future merge in this clone auto-resolves the bundle by keeping "ours".
git config merge.ours.driver true || true

# If a merge still left the bundle in an unresolved conflict state (e.g. the
# driver wasn't configured when the merge ran), resolve it: never hand-merge,
# always take ours and rebuild from the merged sources below.
if git status --porcelain -- api/_server.mjs | grep -qE '^(UU|AA|DD|AU|UA|DU|UD)'; then
  git checkout --ours -- api/_server.mjs 2>/dev/null || true
  git add api/_server.mjs
fi

# Rebuild the bundle from the merged sources so it always matches merged code.
npx esbuild server/app.ts --bundle --platform=node --target=node20 --format=esm --outfile=api/_server.mjs --packages=external --log-level=warning
