import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Guards against Replit-internal registry URLs leaking into package-lock.json.
 * Installing packages inside Replit can rewrite "resolved" URLs to
 * http://package-firewall.replit.local/... which makes `npm ci` fail on
 * external CI (Vercel, GitHub Actions).
 */

const FORBIDDEN_HOST_PATTERNS = [
  /package-firewall\.replit\.local/,
  /\.replit\.local/,
  /\.repl\.co\//,
  /replit\.dev\//,
];

describe("lockfile portability", () => {
  it("package-lock.json contains no Replit-internal registry URLs", () => {
    const lockfilePath = path.resolve(process.cwd(), "package-lock.json");
    const raw = fs.readFileSync(lockfilePath, "utf8");
    const lockfile = JSON.parse(raw) as {
      packages?: Record<string, { resolved?: string }>;
    };

    const offenders: string[] = [];
    for (const [pkgPath, entry] of Object.entries(lockfile.packages ?? {})) {
      const resolved = entry.resolved;
      if (!resolved) continue;
      if (FORBIDDEN_HOST_PATTERNS.some((re) => re.test(resolved))) {
        offenders.push(`${pkgPath || "(root)"} -> ${resolved}`);
      }
    }

    // Also catch any occurrence outside "resolved" fields (e.g. tarball URLs).
    const rawHits = raw.match(/[^"]*replit\.local[^"]*/g) ?? [];

    const message =
      `package-lock.json contains Replit-internal URLs that will break ` +
      `\`npm ci\` on Vercel/GitHub Actions.\n` +
      `Fix: rewrite these URLs to https://registry.npmjs.org/ ` +
      `(e.g. sed -i 's|http://package-firewall.replit.local|https://registry.npmjs.org|g' package-lock.json), ` +
      `then verify with \`npm ci --dry-run\`.\n` +
      `Offending entries:\n${[...offenders, ...rawHits].join("\n")}`;

    expect(offenders, message).toEqual([]);
    expect(rawHits, message).toEqual([]);
  });
});
