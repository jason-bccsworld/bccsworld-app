/**
 * Shared kind/value contract for federal-contracts watchlist entries.
 * Used by BOTH the add-watch form and POST /api/federal-contracts/watchlist so
 * every caller — UI or direct API — gets the same mismatch detection.
 *
 * Warnings are advisory but enforced: the server rejects a warned value unless
 * the caller explicitly confirms it (confirmed: true), so a mismatched watch
 * can never be saved silently.
 */

export const WATCH_KINDS = ["agency", "naics", "keyword", "vendor", "vendor_uei", "contract"] as const;
export type WatchKind = (typeof WATCH_KINDS)[number];

export const WATCH_KIND_META: Record<WatchKind, { label: string; description: string }> = {
  agency: {
    label: "Agency",
    description: "Searches new SAM.gov opportunity notices posted by this agency.",
  },
  naics: {
    label: "NAICS code",
    description: "Searches new SAM.gov opportunity notices under this NAICS industry code.",
  },
  keyword: {
    label: "Keyword",
    description: "Searches new SAM.gov opportunity notices for this word or phrase.",
  },
  vendor: {
    label: "Vendor name",
    description:
      "A specific company name — monitors its award history in USAspending spending records. Does NOT search opportunity notices.",
  },
  vendor_uei: {
    label: "Vendor UEI",
    description:
      "A company's 12-character SAM.gov Unique Entity ID — monitors its awards in USAspending spending records.",
  },
  contract: {
    label: "Contract # (PIID)",
    description: "A specific contract number — tracks that award and its modifications in USAspending.",
  },
};

/** Generic procurement topics that are almost certainly a keyword, not a
 * company name, when entered alone as a vendor watch. */
const GENERIC_TOPIC_WORDS = new Set([
  "software", "training", "security", "services", "consulting", "support",
  "maintenance", "logistics", "construction", "engineering", "aviation",
  "medical", "research", "technology", "data", "cyber", "cybersecurity",
  "cloud", "staffing", "transportation", "equipment", "fuel", "janitorial",
  "landscaping", "it", "healthcare", "analytics", "hardware", "simulation",
]);

const UEI_RE = /^[A-Za-z0-9]{12}$/;
const looksLikeUei = (v: string) => UEI_RE.test(v) && /\d/.test(v);

/**
 * Returns a plain-language warning when the value doesn't fit the selected
 * watch type — explaining what the agent will actually do with it — or null
 * when the pairing looks fine.
 */
export function watchValueWarning(kind: string, raw: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const words = v.split(/\s+/);
  if (kind === "vendor") {
    if (looksLikeUei(v)) {
      return 'That looks like a 12-character UEI. Choose "Vendor UEI" so the agent matches the exact entity instead of searching for a company with this name.';
    }
    if (words.length === 1 && GENERIC_TOPIC_WORDS.has(v.toLowerCase())) {
      return `"${v}" looks like a topic, not a company name. As a vendor watch, the agent will search USAspending for a contractor literally named "${v}" — and will NOT search SAM.gov opportunity notices. If you want new opportunities about ${v.toLowerCase()}, switch to "Keyword".`;
    }
  }
  if (kind === "keyword" || kind === "agency") {
    if (looksLikeUei(v)) {
      return `That looks like a 12-character UEI. A ${WATCH_KIND_META[kind as WatchKind].label.toLowerCase()} watch only searches SAM.gov notice text for it — choose "Vendor UEI" to monitor that company's spending records instead.`;
    }
    if (kind === "keyword" && /\b(inc|llc|corp|co|ltd|company|corporation)\.?$/i.test(v)) {
      return 'That looks like a company name. A keyword watch only searches opportunity notice text — choose "Vendor name" to monitor the company\'s awards in USAspending.';
    }
  }
  if (kind === "vendor_uei" && !UEI_RE.test(v)) {
    return "A SAM.gov UEI is exactly 12 letters/digits. This value doesn't look like one — the USAspending lookup will likely find nothing.";
  }
  if (kind === "naics" && !/^\d{2,6}$/.test(v)) {
    return "A NAICS code is 2–6 digits (e.g. 611512). This value doesn't look like one — the SAM.gov opportunity search will likely find nothing.";
  }
  if (kind === "contract" && !/\d/.test(v)) {
    return "Contract numbers (PIIDs) contain digits (e.g. FA8620-21-C-1234). This value doesn't look like one — the USAspending lookup will likely find nothing.";
  }
  return null;
}
