#!/bin/bash
# Post-merge setup: runs automatically after a task branch is merged.
# Keep idempotent, non-interactive, and fast.
set -e

# Sync dependencies with the merged package.json / package-lock.json.
npm install --no-audit --no-fund

# Schema changes are applied automatically at boot by server/db-init.ts
# (additive DDL against the Neon cloud DB) — no migration step needed here.
