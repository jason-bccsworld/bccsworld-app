/**
 * Solicitation attachment fetcher — shared by the Federal Contracts route
 * ("Fetch attachments" button) and the monitor agent (automatic fetch when a
 * new opportunity is discovered).
 *
 * Downloads a notice's public SAM.gov files, extracts their text, and stores
 * rows in bccs_fedcon_attachments so the work package and AI coach are
 * grounded in the actual solicitation. Every fetch is bounded: exact-host URL
 * trust, streaming byte cap, per-file timeout, and a caller-supplied overall
 * deadline. A missing SAM key surfaces as a SkippedCheck — never silently.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { getSamNoticeResources, type SkippedCheck } from "./fedcon-data";
import { extractText } from "../routes/checklist-report";

export const ATTACHMENT_EXTS = [".pdf", ".docx", ".txt", ".xlsx", ".xls", ".csv"];
export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
export const MAX_ATTACHMENT_TEXT = 400_000;

export function sanitizeFilename(raw: string): string {
  // Basename only, control characters stripped — the value came off the wire.
  const base = raw.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "attachment";
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 400) || "attachment";
}

export function filenameFromResponse(url: string, res: Response): string {
  const cd = res.headers.get("content-disposition") || "";
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  if (m) {
    try { return sanitizeFilename(decodeURIComponent(m[1].replace(/"/g, "").trim())); } catch { /* fall through */ }
  }
  return sanitizeFilename(url.split("?")[0].split("/").filter(Boolean).pop() || "attachment");
}

/** Exact-host trust check: the SAM key may only ever be sent to sam.gov hosts,
 * and attachment URLs (which arrive as external data) are only fetched at all
 * when they are HTTPS links to sam.gov or a subdomain. */
export function trustedSamUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  return host === "sam.gov" || host.endsWith(".sam.gov") ? u : null;
}

/** Download with a hard byte cap enforced while streaming (Content-Length can
 * be absent or forged) and an abort deadline. */
export async function downloadCapped(url: string, timeoutMs: number, maxBytes: number): Promise<{ res: Response; buffer: Buffer }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Redirects are followed manually so every hop is re-validated against the
    // sam.gov trust check — a redirect off-host must fail, never be downloaded.
    let currentUrl = url;
    let res: Response;
    const MAX_REDIRECTS = 5;
    for (let hop = 0; ; hop++) {
      res = await fetch(currentUrl, { signal: controller.signal, redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new Error(`download failed (HTTP ${res.status} redirect without Location)`);
        if (hop >= MAX_REDIRECTS) throw new Error("too many redirects");
        const nextRaw = new URL(location, currentUrl).toString();
        const next = trustedSamUrl(nextRaw);
        if (!next) throw new Error("redirected to an untrusted host — only HTTPS sam.gov links are downloaded");
        currentUrl = next.toString();
        continue;
      }
      break;
    }
    if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
    const lenHeader = Number(res.headers.get("content-length") || 0);
    if (lenHeader > maxBytes) throw new Error(`file too large (${Math.round(lenHeader / 1048576)} MB, limit ${Math.round(maxBytes / 1048576)} MB)`);
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = res.body?.getReader();
    if (!reader) throw new Error("empty response body");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        controller.abort();
        throw new Error(`file too large (limit ${Math.round(maxBytes / 1048576)} MB)`);
      }
      chunks.push(value);
    }
    return { res, buffer: Buffer.concat(chunks) };
  } finally {
    clearTimeout(timer);
  }
}

export interface AttachmentFetchSummary {
  total: number;           // public attachments SAM.gov lists for the notice
  alreadyFetched: number;  // rows already stored (non-failed) before this call
  fetched: number;         // newly extracted this call
  failed: number;
  unsupported: number;
  remaining: number;       // targets not attempted (deadline or per-call cap)
  results: { filename: string; status: string; error?: string }[];
}

/**
 * Fetch and extract a notice's public attachments up to `deadline` (epoch ms)
 * and at most `maxFiles` new files. Failed rows stay retryable — only
 * successful or terminally-unsupported fetches are skipped on later calls.
 * Returns a SkippedCheck when the SAM key is missing or the lookup fails.
 */
export async function fetchNoticeAttachments(
  orgId: string,
  noticeId: string,
  opts: { deadline: number; maxFiles?: number },
): Promise<AttachmentFetchSummary | SkippedCheck> {
  const resources = await getSamNoticeResources(noticeId).catch((err: any): SkippedCheck => ({ check: "sam_attachments", reason: `SAM.gov lookup failed: ${err.message}` }));
  if ("reason" in resources) return resources;

  const existing = new Set(
    await db
      .execute(sql`SELECT url FROM bccs_fedcon_attachments WHERE org_id = ${orgId} AND notice_id = ${noticeId} AND status <> 'failed'`)
      .then((r) => (r as any).rows.map((row: any) => String(row.url))),
  );
  const targets = resources.resourceLinks.filter((u) => !existing.has(u));
  const maxFiles = opts.maxFiles ?? 10;

  let fetched = 0, failed = 0;
  const results: { filename: string; status: string; error?: string }[] = [];

  for (const url of targets.slice(0, maxFiles)) {
    // Reserve headroom for extraction + DB writes of the file we'd start.
    if (opts.deadline - Date.now() < 4_000) break;
    let filename = "attachment";
    try {
      const trusted = trustedSamUrl(url);
      if (!trusted) throw new Error("untrusted attachment host — only HTTPS sam.gov links are downloaded");
      const key = process.env.SAM_GOV_API_KEY;
      if (key) trusted.searchParams.set("api_key", key);
      const dlTimeout = Math.min(10_000, opts.deadline - Date.now() - 3_000);
      const { res: dl, buffer } = await downloadCapped(trusted.toString(), dlTimeout, MAX_ATTACHMENT_BYTES);
      filename = filenameFromResponse(url, dl);
      const ext = (filename.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
      if (!ATTACHMENT_EXTS.includes(ext)) {
        await db.execute(sql`
          INSERT INTO bccs_fedcon_attachments (org_id, notice_id, filename, url, status, error)
          VALUES (${orgId}, ${noticeId}, ${filename}, ${url}, 'unsupported', ${`Unsupported file type ${ext || "(none)"} — reviewed manually on SAM.gov.`})
          ON CONFLICT (org_id, notice_id, url) DO NOTHING
        `);
        results.push({ filename, status: "unsupported" });
        continue;
      }
      const text = (await extractText(filename, buffer)).slice(0, MAX_ATTACHMENT_TEXT);
      await db.execute(sql`
        INSERT INTO bccs_fedcon_attachments (org_id, notice_id, filename, url, extracted_text, text_chars, status)
        VALUES (${orgId}, ${noticeId}, ${filename}, ${url}, ${text}, ${text.length}, 'extracted')
        ON CONFLICT (org_id, notice_id, url) DO UPDATE SET extracted_text = EXCLUDED.extracted_text, text_chars = EXCLUDED.text_chars, status = 'extracted', error = NULL, fetched_at = NOW()
      `);
      fetched++;
      results.push({ filename, status: "extracted" });
    } catch (err: any) {
      failed++;
      const msg = String(err?.name === "AbortError" ? "download timed out" : err?.message || "unknown error").slice(0, 500);
      await db.execute(sql`
        INSERT INTO bccs_fedcon_attachments (org_id, notice_id, filename, url, status, error)
        VALUES (${orgId}, ${noticeId}, ${filename}, ${url}, 'failed', ${msg})
        ON CONFLICT (org_id, notice_id, url) DO UPDATE SET status = 'failed', error = EXCLUDED.error, fetched_at = NOW()
      `);
      results.push({ filename, status: "failed", error: msg });
    }
  }

  const remaining = targets.length - results.length;

  // Keep the opportunity's resume flag current: TRUE while retryable work is
  // left (failed rows or targets deferred by the cap/deadline), FALSE once the
  // notice is fully fetched. Later patrol runs resume flagged notices.
  await db.execute(sql`
    UPDATE bccs_fedcon_opportunities
    SET attachments_pending = ${failed > 0 || remaining > 0}, updated_at = NOW()
    WHERE org_id = ${orgId} AND notice_id = ${noticeId}
  `);

  return {
    total: resources.resourceLinks.length,
    alreadyFetched: existing.size,
    fetched,
    failed,
    unsupported: results.filter((r) => r.status === "unsupported").length,
    remaining,
    results,
  };
}
