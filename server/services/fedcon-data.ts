/**
 * Federal contracts external data layer — SAM.gov + USAspending.gov clients.
 *
 * USAspending.gov is fully public. SAM.gov endpoints (opportunities search,
 * exclusions) require SAM_GOV_API_KEY; when the key is absent, callers get a
 * SkippedCheck instead of a silent failure so runs can report exactly which
 * checks were skipped.
 *
 * All lookups go through a small in-memory TTL cache keyed by request, so a
 * patrol across many orgs sharing watchlist targets doesn't hammer the APIs.
 */

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

export interface SkippedCheck {
  check: string;
  reason: string;
}

export function samKeyAvailable(): boolean {
  return !!process.env.SAM_GOV_API_KEY;
}

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data as T;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  // Bounded cache: drop oldest entries past 500.
  if (cache.size > 500) {
    const oldest = Array.from(cache.keys())[0];
    cache.delete(oldest);
  }
  return data;
}

async function fetchJson(url: string, init?: RequestInit, attempt = 0): Promise<any> {
  const res = await fetch(url, init);
  if (res.status === 429 && attempt < 2) {
    // Rate limited — back off and retry once or twice.
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    return fetchJson(url, init, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} from ${url.split("?")[0]}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** USAspending returns NAICS as either a string code or {code, description}. */
function naicsCode(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 50);
  if (typeof v === "object" && v.code) return String(v.code).slice(0, 50);
  return null;
}

function fmtSamDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

/* ── SAM.gov ──────────────────────────────────────────────────────────────── */

export interface SamOpportunity {
  noticeId: string;
  title: string;
  agency: string | null;
  naics: string | null;
  psc: string | null;
  setAside: string | null;
  noticeType: string | null;
  postedDate: string | null;
  responseDeadline: string | null;
  url: string | null;
  description: string | null;
}

/** Search active SAM.gov opportunity notices posted in the last `daysBack` days. */
export async function searchSamOpportunities(params: {
  keyword?: string;
  naics?: string;
  agency?: string;
  daysBack?: number;
  limit?: number;
}): Promise<SamOpportunity[] | SkippedCheck> {
  const key = process.env.SAM_GOV_API_KEY;
  if (!key) {
    return { check: "sam_opportunities", reason: "SAM_GOV_API_KEY not configured — opportunity search skipped" };
  }
  const daysBack = params.daysBack ?? 30;
  const to = new Date();
  const from = new Date(Date.now() - daysBack * 86400000);
  const qs = new URLSearchParams({
    api_key: key,
    limit: String(params.limit ?? 25),
    postedFrom: fmtSamDate(from),
    postedTo: fmtSamDate(to),
  });
  if (params.keyword) qs.set("title", params.keyword);
  if (params.naics) qs.set("ncode", params.naics);
  if (params.agency) qs.set("organizationName", params.agency);

  const cacheKey = `samopp:${qs.toString().replace(key, "")}`;
  const data = await cached(cacheKey, () =>
    fetchJson(`https://api.sam.gov/opportunities/v2/search?${qs.toString()}`),
  );
  const list = Array.isArray((data as any)?.opportunitiesData) ? (data as any).opportunitiesData : [];
  return list.map((o: any): SamOpportunity => ({
    noticeId: String(o.noticeId ?? o.solicitationNumber ?? ""),
    title: String(o.title ?? "Untitled notice"),
    agency: o.fullParentPathName ?? o.department ?? null,
    naics: o.naicsCode ?? null,
    psc: o.classificationCode ?? null,
    setAside: o.typeOfSetAsideDescription ?? o.typeOfSetAside ?? null,
    noticeType: o.type ?? null,
    postedDate: o.postedDate ?? null,
    responseDeadline: o.responseDeadLine ?? null,
    url: o.uiLink ?? null,
    description: typeof o.description === "string" && !o.description.startsWith("http") ? o.description : null,
  })).filter((o: SamOpportunity) => o.noticeId);
}

/** Public attachment links (resourceLinks) + description URL for one notice. */
export async function getSamNoticeResources(noticeId: string): Promise<{ resourceLinks: string[]; descriptionUrl: string | null } | SkippedCheck> {
  const key = process.env.SAM_GOV_API_KEY;
  if (!key) {
    return { check: "sam_attachments", reason: "SAM_GOV_API_KEY not configured — attachment fetch skipped" };
  }
  // The v2 search API is the documented way to look a notice up by id; it
  // returns resourceLinks (direct public file-download URLs) per notice.
  // Search back a year in two windows (the API caps a window at 1 year).
  for (let win = 0; win < 2; win++) {
    const to = new Date(Date.now() - win * 364 * 86400000);
    const from = new Date(to.getTime() - 364 * 86400000);
    const qs = new URLSearchParams({ api_key: key, limit: "10", noticeid: noticeId, postedFrom: fmtSamDate(from), postedTo: fmtSamDate(to) });
    const data = await fetchJson(`https://api.sam.gov/opportunities/v2/search?${qs.toString()}`);
    const list = Array.isArray((data as any)?.opportunitiesData) ? (data as any).opportunitiesData : [];
    const hit = list.find((o: any) => String(o.noticeId) === noticeId) ?? list[0];
    if (hit) {
      return {
        resourceLinks: Array.isArray(hit.resourceLinks) ? hit.resourceLinks.map((u: any) => String(u)).filter(Boolean) : [],
        descriptionUrl: typeof hit.description === "string" && hit.description.startsWith("http") ? hit.description : null,
      };
    }
  }
  return { resourceLinks: [], descriptionUrl: null };
}

export interface ExclusionResult {
  excluded: boolean;
  records: { name: string; classification: string | null; activationDate: string | null }[];
}

/** Check the SAM.gov exclusions list for a vendor by UEI or name. */
export async function checkSamExclusions(vendor: { uei?: string; name?: string }): Promise<ExclusionResult | SkippedCheck> {
  const key = process.env.SAM_GOV_API_KEY;
  if (!key) {
    return { check: "sam_exclusions", reason: "SAM_GOV_API_KEY not configured — exclusion/debarment check skipped" };
  }
  const qs = new URLSearchParams({ api_key: key });
  if (vendor.uei) qs.set("ueiSAM", vendor.uei);
  else if (vendor.name) qs.set("exclusionName", vendor.name);
  else return { excluded: false, records: [] };

  const cacheKey = `samexcl:${vendor.uei ?? vendor.name}`;
  const data = await cached(cacheKey, () =>
    fetchJson(`https://api.sam.gov/entity-information/v4/exclusions?${qs.toString()}`),
  );
  const rows = Array.isArray((data as any)?.excludedEntity) ? (data as any).excludedEntity : [];
  return {
    excluded: rows.length > 0,
    records: rows.slice(0, 5).map((r: any) => ({
      name: r?.exclusionDetails?.exclusionName ?? r?.exclusionName ?? vendor.name ?? vendor.uei ?? "unknown",
      classification: r?.exclusionDetails?.classificationType ?? null,
      activationDate: r?.exclusionDetails?.activateDate ?? null,
    })),
  };
}

/* ── USAspending.gov (public, no key) ─────────────────────────────────────── */

export interface UsaAward {
  awardId: string; // PIID / Award ID
  generatedId: string | null;
  recipientName: string | null;
  recipientUei: string | null;
  agency: string | null;
  naics: string | null;
  awardAmount: number;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  awardType: string | null;
}

/** Contract awards for a recipient (name or UEI) over the last `yearsBack` years. */
export async function searchAwardsByRecipient(params: {
  recipient: string;
  yearsBack?: number;
  limit?: number;
}): Promise<UsaAward[]> {
  const yearsBack = params.yearsBack ?? 3;
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - yearsBack * 365 * 86400000).toISOString().slice(0, 10);
  const body = {
    filters: {
      recipient_search_text: [params.recipient],
      time_period: [{ start_date: start, end_date: end }],
      award_type_codes: ["A", "B", "C", "D"],
    },
    fields: [
      "Award ID", "Recipient Name", "recipient_id", "Start Date", "End Date",
      "Award Amount", "Awarding Agency", "Awarding Sub Agency", "Contract Award Type",
      "Description", "NAICS", "generated_internal_id", "Recipient UEI",
    ],
    limit: params.limit ?? 30,
    order: "desc",
    sort: "Award Amount",
  };
  const cacheKey = `usaawards:${params.recipient}:${yearsBack}`;
  const data = await cached(cacheKey, () =>
    fetchJson("https://api.usaspending.gov/api/v2/search/spending_by_award/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const rows = Array.isArray((data as any)?.results) ? (data as any).results : [];
  return rows.map((r: any): UsaAward => ({
    awardId: String(r["Award ID"] ?? ""),
    generatedId: r.generated_internal_id ?? null,
    recipientName: r["Recipient Name"] ?? null,
    recipientUei: r["Recipient UEI"] ?? null,
    agency: r["Awarding Agency"] ?? null,
    naics: naicsCode(r["NAICS"]),
    awardAmount: Number(r["Award Amount"] ?? 0),
    startDate: r["Start Date"] ?? null,
    endDate: r["End Date"] ?? null,
    description: r["Description"] ?? null,
    awardType: r["Contract Award Type"] ?? null,
  })).filter((a: UsaAward) => a.awardId);
}

/** Search awards by exact Award ID / PIID. */
export async function searchAwardByPiid(piid: string): Promise<UsaAward[]> {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 10 * 365 * 86400000).toISOString().slice(0, 10);
  const body = {
    filters: {
      award_ids: [piid],
      time_period: [{ start_date: start, end_date: end }],
      award_type_codes: ["A", "B", "C", "D"],
    },
    fields: [
      "Award ID", "Recipient Name", "Start Date", "End Date", "Award Amount",
      "Awarding Agency", "Contract Award Type", "Description", "NAICS",
      "generated_internal_id", "Recipient UEI",
    ],
    limit: 5,
  };
  const data = await cached(`usapiid:${piid}`, () =>
    fetchJson("https://api.usaspending.gov/api/v2/search/spending_by_award/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const rows = Array.isArray((data as any)?.results) ? (data as any).results : [];
  return rows.map((r: any): UsaAward => ({
    awardId: String(r["Award ID"] ?? ""),
    generatedId: r.generated_internal_id ?? null,
    recipientName: r["Recipient Name"] ?? null,
    recipientUei: r["Recipient UEI"] ?? null,
    agency: r["Awarding Agency"] ?? null,
    naics: naicsCode(r["NAICS"]),
    awardAmount: Number(r["Award Amount"] ?? 0),
    startDate: r["Start Date"] ?? null,
    endDate: r["End Date"] ?? null,
    description: r["Description"] ?? null,
    awardType: r["Contract Award Type"] ?? null,
  })).filter((a: UsaAward) => a.awardId);
}

export interface AwardModifications {
  transactionCount: number;
  modificationCount: number;
  recentModsWithin90Days: number;
}

/** Count contract modifications (transactions beyond the base action) for an award. */
export async function getAwardModifications(generatedId: string, awardStartDate?: string | null): Promise<AwardModifications> {
  const data = await cached(`usatx:${generatedId}`, () =>
    fetchJson("https://api.usaspending.gov/api/v2/transactions/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ award_id: generatedId, limit: 100, page: 1 }),
    }),
  );
  const rows = Array.isArray((data as any)?.results) ? (data as any).results : [];
  const mods = rows.filter((t: any) => {
    const num = String(t.modification_number ?? "").trim();
    return num !== "" && num !== "0";
  });
  let recent = 0;
  if (awardStartDate) {
    const start = new Date(awardStartDate).getTime();
    const cutoff = start + 90 * 86400000;
    recent = mods.filter((t: any) => {
      const d = new Date(t.action_date ?? 0).getTime();
      return d > start && d <= cutoff;
    }).length;
  }
  return { transactionCount: rows.length, modificationCount: mods.length, recentModsWithin90Days: recent };
}
