/**
 * Regression tests for the instructor key expiry digest dedupe/re-arm logic
 * in runInstructorKeyExpirySweep (server/services/instructor-key-expiry-monitor.ts).
 *
 * The sweep's REAL SQL runs against a disposable in-process Postgres
 * (PGlite) seeded with the production table shapes, so regressions in the
 * query itself — dropping the NOT EXISTS dedupe, widening/narrowing the
 * 14-day window, breaking the expiry-date kind expression — fail these
 * tests. Only sendEmailToOrgAdmins is mocked (skip reason or null = sent).
 *
 * Covered:
 *  - a notice is sent once per (key, expiry date): repeated sweeps don't re-send
 *  - an email skip (SMTP unconfigured / no recipients) writes NO dedupe row,
 *    so the next sweep retries and sends once email works
 *  - renewing a key (new expires_at) changes the dedupe kind, so the key
 *    warns again when the new expiry approaches
 *  - one digest per org; keys outside the window / without expiry are ignored
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

/* ── Real Postgres (PGlite) behind the drizzle db mock ────────────────────── */

const h = vi.hoisted(() => ({
  dbPromise: (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    return { client, db: drizzle(client) };
  })(),
}));

vi.mock("../../db", async () => {
  const { db } = await h.dbPromise;
  return { db, pool: {} };
});

const sendEmailToOrgAdmins = vi.hoisted(() =>
  vi.fn<(orgId: string, msg: any) => Promise<string | null>>(),
);
vi.mock("../email-alerts", () => ({ sendEmailToOrgAdmins }));

import { runInstructorKeyExpirySweep } from "../instructor-key-expiry-monitor";

/* ── Schema (mirrors the production tables the sweep touches) ─────────────── */

const ORG1 = "11111111-1111-4111-8111-111111111111";
const ORG2 = "22222222-2222-4222-8222-222222222222";
const DAY = 24 * 60 * 60 * 1000;

let pg: import("@electric-sql/pglite").PGlite;

beforeAll(async () => {
  pg = (await h.dbPromise).client;
  await pg.exec(`
    CREATE TABLE training_organizations (
      id UUID PRIMARY KEY,
      organization_name TEXT NOT NULL
    );
    CREATE TABLE bccs_instructor_records (
      id TEXT PRIMARY KEY,
      organization_id UUID NOT NULL,
      first_name TEXT,
      last_name TEXT
    );
    CREATE TABLE bccs_instructor_keys (
      id TEXT PRIMARY KEY,
      instructor_id TEXT NOT NULL,
      organization_id UUID NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      expires_at TIMESTAMPTZ
    );
    CREATE TABLE bccs_instructor_key_notifications (
      id SERIAL PRIMARY KEY,
      key_id TEXT NOT NULL,
      organization_id UUID NOT NULL,
      kind TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (key_id, kind)
    );
    INSERT INTO training_organizations (id, organization_name)
    VALUES ('${ORG1}', 'Acme Flight'), ('${ORG2}', 'Beta Aviation');
  `);
});

afterAll(async () => {
  await pg?.close();
});

beforeEach(async () => {
  await pg.exec(`
    DELETE FROM bccs_instructor_key_notifications;
    DELETE FROM bccs_instructor_keys;
    DELETE FROM bccs_instructor_records;
  `);
  sendEmailToOrgAdmins.mockReset();
  sendEmailToOrgAdmins.mockResolvedValue(null); // default: email sends fine
});

/* ── Fixtures / helpers ───────────────────────────────────────────────────── */

let nextId = 1;
async function addKey(
  opts: { org?: string; expiresInDays?: number | null; active?: boolean } = {},
) {
  const id = `key-${nextId++}`;
  const instructorId = `inst-${nextId++}`;
  const org = opts.org ?? ORG1;
  const expiresAt =
    opts.expiresInDays === null
      ? null
      : new Date(Date.now() + (opts.expiresInDays ?? 5) * DAY);
  await pg.query(
    `INSERT INTO bccs_instructor_records (id, organization_id, first_name, last_name)
     VALUES ($1, $2, 'Ida', $1)`,
    [instructorId, org],
  );
  await pg.query(
    `INSERT INTO bccs_instructor_keys (id, instructor_id, organization_id, is_active, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, instructorId, org, opts.active ?? true, expiresAt],
  );
  return { id, org, expiresAt };
}

async function setExpiry(keyId: string, expiresAt: Date) {
  await pg.query(`UPDATE bccs_instructor_keys SET expires_at = $2 WHERE id = $1`, [
    keyId,
    expiresAt,
  ]);
}

async function notifications(): Promise<{ key_id: string; organization_id: string; kind: string }[]> {
  const r = await pg.query(
    `SELECT key_id, organization_id::text AS organization_id, kind
     FROM bccs_instructor_key_notifications ORDER BY id`,
  );
  return r.rows as any[];
}

const kindFor = (expiresAt: Date) => `expiry_${expiresAt.toISOString().slice(0, 10)}`;

/* ── One notice per (key, expiry date) ────────────────────────────────────── */

describe("dedupe: one notice per (key, expiry date)", () => {
  it("sends a digest for an expiring key and records a dedupe row keyed to the expiry date", async () => {
    const key = await addKey({ expiresInDays: 5 });
    await runInstructorKeyExpirySweep();

    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(1);
    expect(sendEmailToOrgAdmins).toHaveBeenCalledWith(
      ORG1,
      expect.objectContaining({ subject: expect.stringMatching(/expir/i) }),
    );
    expect(await notifications()).toEqual([
      { key_id: key.id, organization_id: ORG1, kind: kindFor(key.expiresAt!) },
    ]);
  });

  it("repeated sweeps do not re-send for the same expiry date", async () => {
    await addKey({ expiresInDays: 5 });
    await runInstructorKeyExpirySweep();
    await runInstructorKeyExpirySweep();
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(1);
    expect(await notifications()).toHaveLength(1);
  });

  it("an already-expired but still-active key is included once", async () => {
    await addKey({ expiresInDays: -2 });
    await runInstructorKeyExpirySweep();
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(1);
  });

  it("ignores keys outside the 14-day window, without expiry, or inactive", async () => {
    await addKey({ expiresInDays: 60 });
    await addKey({ expiresInDays: null });
    await addKey({ expiresInDays: 3, active: false });
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).not.toHaveBeenCalled();
    expect(await notifications()).toHaveLength(0);
  });

  it("groups multiple expiring keys of one org into a single digest email", async () => {
    const a = await addKey({ expiresInDays: 3 });
    const b = await addKey({ expiresInDays: 10 });
    await addKey({ org: ORG2, expiresInDays: 4 });
    await runInstructorKeyExpirySweep();

    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(2); // one per org
    const org1Call = sendEmailToOrgAdmins.mock.calls.find(([org]) => org === ORG1)!;
    expect(org1Call[1].subject).toMatch(/2 instructor portal keys/i);
    const noted = await notifications();
    expect(noted.filter((n) => [a.id, b.id].includes(n.key_id))).toHaveLength(2);
    expect(noted).toHaveLength(3);
  });
});

/* ── Skip → retry ─────────────────────────────────────────────────────────── */

describe("email skip writes no dedupe row, so the sweep retries", () => {
  it("retries after an SMTP-unconfigured skip and sends once email works", async () => {
    const key = await addKey({ expiresInDays: 5 });

    sendEmailToOrgAdmins.mockResolvedValueOnce("skipped: SMTP not configured");
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(1);
    expect(await notifications()).toHaveLength(0); // no dedupe row on skip

    await runInstructorKeyExpirySweep(); // email now works (default mock)
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(2);
    expect(await notifications()).toEqual([
      { key_id: key.id, organization_id: ORG1, kind: kindFor(key.expiresAt!) },
    ]);

    await runInstructorKeyExpirySweep(); // and now it is deduped
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(2);
  });

  it("a skip for one org does not block the digest or dedupe of another org", async () => {
    await addKey({ org: ORG1, expiresInDays: 5 });
    const okKey = await addKey({ org: ORG2, expiresInDays: 5 });
    sendEmailToOrgAdmins.mockImplementation(async (org) =>
      org === ORG1 ? "skipped: no admin recipients" : null,
    );

    await runInstructorKeyExpirySweep();
    expect(await notifications()).toEqual([
      { key_id: okKey.id, organization_id: ORG2, kind: kindFor(okKey.expiresAt!) },
    ]);
  });

  it("an email throw is caught, writes no dedupe row, and retries next sweep", async () => {
    await addKey({ expiresInDays: 5 });
    sendEmailToOrgAdmins.mockRejectedValueOnce(new Error("SMTP connect refused"));
    await expect(runInstructorKeyExpirySweep()).resolves.toBeUndefined();
    expect(await notifications()).toHaveLength(0);

    await runInstructorKeyExpirySweep();
    expect(await notifications()).toHaveLength(1);
  });
});

/* ── Renewal re-arms ──────────────────────────────────────────────────────── */

describe("renewal (new expires_at) re-arms the warning", () => {
  it("a renewed key warns again when its new expiry date enters the window", async () => {
    const key = await addKey({ expiresInDays: 5 });
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(1);
    const firstKind = kindFor(key.expiresAt!);

    // Renew: new expiry far in the future → out of window, nothing sent.
    await setExpiry(key.id, new Date(Date.now() + 90 * DAY));
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(1);

    // Time passes: the renewed expiry enters the 14-day window. The old
    // dedupe row (old kind) must not suppress the new expiry date.
    const secondExpiry = new Date(Date.now() + 7 * DAY);
    await setExpiry(key.id, secondExpiry);
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(2);

    const kinds = (await notifications()).filter((n) => n.key_id === key.id).map((n) => n.kind);
    expect(kinds).toEqual([firstKind, kindFor(secondExpiry)]);
    expect(new Set(kinds).size).toBe(2); // distinct dedupe kinds per expiry date

    // And the new notice is deduped like any other.
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(2);
  });

  it("renewing to the SAME expiry date stays deduped (kind unchanged)", async () => {
    const key = await addKey({ expiresInDays: 5 });
    await runInstructorKeyExpirySweep();
    // "Renewal" that lands on the same calendar date → same kind → no re-send.
    await setExpiry(key.id, new Date(key.expiresAt!.getTime() + 60 * 1000));
    await runInstructorKeyExpirySweep();
    expect(sendEmailToOrgAdmins).toHaveBeenCalledTimes(1);
  });
});
