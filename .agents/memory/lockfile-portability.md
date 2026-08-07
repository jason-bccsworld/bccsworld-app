---
name: Lockfile portability
description: Replit package proxy URLs in package-lock.json break installs on external CI (Vercel, GitHub Actions).
---

Package installs inside Replit can go through an internal proxy, leaving `resolved` URLs like `http://package-firewall.replit.local/npm/...` in `package-lock.json`. That host only exists inside Replit.

**Why:** On Vercel, `npm install`/`npm ci` hung ~70s on those unreachable URLs and died with npm's misleading internal error "Exit handler never called!" — the error looked like an npm bug (and survived fresh caches and pinned npm versions), when the real cause was 19 proxy URLs in the lockfile.

**How to apply:**
- When any external CI install fails mysteriously, first run: `grep -c 'package-firewall.replit.local' package-lock.json`.
- Fix by string-replacing `http://package-firewall.replit.local/npm/` with `https://registry.npmjs.org/` — tarball paths and integrity hashes are identical, so no other change is needed.
- Installing new packages in Replit afterwards can re-introduce proxy URLs; re-check the lockfile before pushing to GitHub for external deploys.
- The rewrite is safe for local installs: npm inside Replit has its registry configured to the firewall and routes all fetches through it regardless of `resolved` URLs. You can't fully validate `npm ci` against npmjs from inside Replit (the firewall intercepts); instead verify by curling the npmjs tarball and comparing its sha512 to the lockfile `integrity` field.
