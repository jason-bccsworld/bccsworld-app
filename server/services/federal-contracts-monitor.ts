/**
 * Federal Contracts Monitor Agent — watches US government contract activity
 * against each organization's watchlist, following the standards distilled
 * from the Fed Contracts Notes and the Federal Contractor Due-Diligence
 * Checklist for M&A:
 *
 *   1. Opportunity & market watch — SAM.gov opportunity notices matching
 *      watchlist agencies/NAICS/keywords become tracked research records
 *      (the source docs' research template), enriched by GPT-4o.
 *   2. Award dossiers — USAspending award history for tracked vendors and
 *      contract numbers, with modification counts and evidence context.
 *   3. Red-flag surveillance — a deterministic risk rubric with the
 *      checklist's point weights; veto flags (active SAM exclusion) force
 *      the Critical tier regardless of composite score.
 *
 * All scoring is done in code. The LLM only condenses text into dossier
 * fields and never decides a flag. SAM.gov checks that need an API key are
 * reported as skipped — never silently dropped.
 */
import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { startRun, finishRun, emitAgentEvent } from "./agent-registry";
import {
  samKeyAvailable,
  searchSamOpportunities,
  checkSamExclusions,
  searchAwardsByRecipient,
  searchAwardByPiid,
  getAwardModifications,
  type SkippedCheck,
  type UsaAward,
} from "./fedcon-data";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "not-configured" });

const AGENT_ID = "federal-contracts-monitor";
const AGENT_NAME = "Federal Contracts Monitor";

/* ── Risk rubric (point weights from the due-diligence checklist) ─────────── */

interface RiskFlag {
  key: string;
  label: string;
  category: string;
  points: number;
  veto: boolean;
  detail?: Record<string, unknown>;
}

const RUBRIC = {
  activeExclusion: { points: 10, veto: true },          // §7.3 active SAM exclusion/debarment
  heavyEarlyModifications: { points: 5, veto: false },  // §Red flags: heavily modified soon after award
  manyModifications: { points: 4, veto: false },        // repeated scope creep signal
  recompeteWindow: { points: 5, veto: false },          // §7.1 material contract nearing recompete
  vendorConcentration: { points: 6, veto: false },      // §7.1 revenue concentration >30%
  setAsideAffiliationRisk: { points: 7, veto: false },  // §7.1 set-aside affiliation risk
} as const;

function tierFor(score: number, hasVeto: boolean): "low" | "moderate" | "high" | "critical" {
  if (hasVeto || score >= 61) return "critical";
  if (score >= 36) return "high";
  if (score >= 16) return "moderate";
  return "low";
}

const TIER_SEVERITY: Record<string, string> = {
  critical: "critical",
  high: "high",
  moderate: "medium",
  low: "low",
};

/* ── Manual checklist items (rubric items needing non-public sources) ─────── */

const MANUAL_CHECKLIST: { key: string; label: string }[] = [
  { key: "cpars_review", label: "CPARS/PPIRS past-performance ratings reviewed (login-gated — obtain from target or CO)" },
  { key: "dcaa_audit_history", label: "DCAA/DCMA audit history requested (incurred cost audits, business-system determinations)" },
  { key: "oig_audit_search", label: "GSA/agency OIG audit reports searched for the vendor (gsaig.gov, oversight.gov)" },
  { key: "novation_analysis", label: "Novation requirement analysis under FAR 42.1204 (deal-structure dependent)" },
  { key: "oci_mapping", label: "Organizational Conflict of Interest exposure mapped (FAR Subpart 9.5 categories)" },
  { key: "fca_litigation", label: "False Claims Act / qui tam litigation docket search completed" },
];

/* ── Findings plumbing (compliance-watchdog pattern) ─────────────────────── */

interface Candidate {
  findingType: string;
  severity: string;
  title: string;
  detail: Record<string, unknown>;
  relatedRecordId: string;
}

/**
 * Coverage-gated auto-resolve: an open finding may only be resolved when the
 * check that produced it was actually re-evaluated successfully this run.
 * Skipped checks (missing SAM key), API failures, and watchlist items beyond
 * per-run caps produce no coverage — their findings are preserved, never
 * silently closed.
 */
function coverageKeyFor(findingType: string, relatedRecordId: string): string | null {
  switch (findingType) {
    case "vendor_excluded": return `excl|${relatedRecordId}`;
    case "vendor_risk_tier": return `vendor|${relatedRecordId}`;
    case "heavy_modifications": return `mods|${relatedRecordId}`;
    case "recompete_window": return `recompete|${relatedRecordId}`;
    case "contract_not_found": return `contract|${relatedRecordId}`;
    case "new_opportunity": return null; // one-shot notification — always resolvable
    default: return `unknown|${findingType}|${relatedRecordId}`; // never covered → never auto-resolved
  }
}

async function reconcileFindings(orgId: string, candidatesIn: Candidate[], coverage: Set<string>): Promise<{ created: number; resolved: number }> {
  let candidates = candidatesIn;
  // In-run dedupe: the same award can surface via both a vendor watch and a
  // contract watch — keep only the first candidate per findingType|record key.
  const seen = new Set<string>();
  candidates = candidates.filter((c) => {
    const k = `${c.findingType}|${c.relatedRecordId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const openRows = await db
    .execute(sql`
      SELECT id, finding_type, related_record_id, severity, title
      FROM bccs_agent_findings
      WHERE agent_id = ${AGENT_ID} AND org_id = ${orgId} AND status IN ('open', 'acknowledged')
    `)
    .then((r) => (r as any).rows);

  const candidateKeys = new Set(candidates.map((c) => `${c.findingType}|${c.relatedRecordId}`));
  const openByKey = new Map<string, any>(
    openRows.map((r: any) => [`${r.finding_type}|${r.related_record_id}`, r]),
  );

  let created = 0;
  for (const c of candidates) {
    const existing = openByKey.get(`${c.findingType}|${c.relatedRecordId}`);
    if (existing) {
      if (existing.severity !== c.severity || existing.title !== c.title) {
        await db.execute(sql`
          UPDATE bccs_agent_findings
          SET severity = ${c.severity}, title = ${c.title}, detail = ${JSON.stringify(c.detail)}::jsonb
          WHERE id = ${existing.id}
        `);
      }
      continue;
    }
    await db.execute(sql`
      INSERT INTO bccs_agent_findings (agent_id, org_id, finding_type, severity, title, detail, related_record_id)
      VALUES (${AGENT_ID}, ${orgId}, ${c.findingType}, ${c.severity}, ${c.title}, ${JSON.stringify(c.detail)}::jsonb, ${c.relatedRecordId})
    `);
    created++;
  }

  let resolved = 0;
  for (const row of openRows) {
    if (candidateKeys.has(`${row.finding_type}|${row.related_record_id}`)) continue;
    const covKey = coverageKeyFor(row.finding_type, row.related_record_id);
    if (covKey !== null && !coverage.has(covKey)) continue; // check not re-run — keep the finding open
    await db.execute(sql`UPDATE bccs_agent_findings SET status = 'resolved' WHERE id = ${row.id}`);
    resolved++;
  }
  return { created, resolved };
}

/* ── LLM enrichment: research-template dossier from raw notice text ───────── */

async function enrichOpportunityDossier(opp: {
  title: string;
  agency: string | null;
  naics: string | null;
  setAside: string | null;
  noticeType: string | null;
  description: string | null;
}): Promise<Record<string, unknown>> {
  if (!process.env.OPENAI_API_KEY) return {};
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a federal contracts market analyst. Condense the opportunity notice into the standard research template. Return JSON:
{"requirementSummary":"<1-2 sentences: what the government is buying>","contractVehicle":"<IDIQ/BPA/GSA Schedule/task order/standalone/unknown>","evaluationSignals":"<key evaluation or compliance factors visible in the text, or 'not stated'>","complianceObligations":"<FAR/DFARS/cyber/labor obligations mentioned, or 'not stated'>","incumbentSignal":"<any hint the requirement favors an incumbent, or 'none visible'>"}
Be factual. Never invent details not present in the input.`,
        },
        { role: "user", content: JSON.stringify(opp) },
      ],
      response_format: { type: "json_object" },
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (err) {
    console.error("[federal-contracts-monitor] dossier enrichment failed (non-fatal):", err);
    return {};
  }
}

/* ── Per-org patrol ───────────────────────────────────────────────────────── */

interface PatrolResult {
  itemsScanned: number;
  newFindings: number;
  autoResolved: number;
  skippedChecks: SkippedCheck[];
}

function isSkipped(x: unknown): x is SkippedCheck {
  return !!x && typeof x === "object" && "check" in (x as any) && "reason" in (x as any);
}

async function ensureManualChecklist(orgId: string, subjectType: string, subjectId: string): Promise<void> {
  for (const item of MANUAL_CHECKLIST) {
    await db.execute(sql`
      INSERT INTO bccs_fedcon_checklist (org_id, subject_type, subject_id, item_key, label)
      VALUES (${orgId}, ${subjectType}, ${subjectId}, ${item.key}, ${item.label})
      ON CONFLICT (org_id, subject_type, subject_id, item_key) DO NOTHING
    `);
  }
}

async function upsertAward(orgId: string, awardKey: string, a: UsaAward, mods: { modificationCount: number | null; recentModsWithin90Days: number | null }, flags: RiskFlag[], score: number, tier: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO bccs_fedcon_awards
      (org_id, award_key, piid, generated_award_id, vendor_name, vendor_uei, agency, naics,
       award_amount, start_date, end_date, modification_count, dossier, risk_flags, risk_score, risk_tier, last_checked)
    VALUES
      (${orgId}, ${awardKey}, ${a.awardId}, ${a.generatedId}, ${a.recipientName}, ${a.recipientUei}, ${a.agency}, ${a.naics},
       ${a.awardAmount}, ${a.startDate}, ${a.endDate}, ${mods.modificationCount},
       ${JSON.stringify({ description: a.description, awardType: a.awardType, recentModsWithin90Days: mods.recentModsWithin90Days })}::jsonb,
       ${JSON.stringify(flags)}::jsonb, ${score}, ${tier}, NOW())
    ON CONFLICT (org_id, award_key) DO UPDATE SET
      vendor_name = EXCLUDED.vendor_name, vendor_uei = EXCLUDED.vendor_uei, agency = EXCLUDED.agency,
      naics = EXCLUDED.naics, award_amount = EXCLUDED.award_amount, start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date, modification_count = COALESCE(EXCLUDED.modification_count, bccs_fedcon_awards.modification_count),
      dossier = EXCLUDED.dossier, risk_flags = EXCLUDED.risk_flags, risk_score = EXCLUDED.risk_score,
      risk_tier = EXCLUDED.risk_tier, last_checked = NOW()
  `);
}

async function patrolOrg(orgId: string): Promise<PatrolResult> {
  const skipped: SkippedCheck[] = [];
  const candidates: Candidate[] = [];
  const coverage = new Set<string>();
  let itemsScanned = 0;

  const watchlist = await db
    .execute(sql`SELECT id, kind, value, label FROM bccs_fedcon_watchlist WHERE org_id = ${orgId}`)
    .then((r) => (r as any).rows as { id: string; kind: string; value: string; label: string | null }[]);

  if (watchlist.length === 0) {
    return { itemsScanned: 0, newFindings: 0, autoResolved: 0, skippedChecks: [] };
  }

  /* 1 ── Opportunity watch (SAM.gov, key-gated) */
  const oppTargets = watchlist.filter((w) => ["keyword", "naics", "agency"].includes(w.kind));
  if (oppTargets.length > 0 && !samKeyAvailable()) {
    skipped.push({ check: "sam_opportunities", reason: "SAM_GOV_API_KEY not configured — opportunity watch skipped" });
  }
  for (const target of oppTargets.slice(0, 10)) {
    const result = await searchSamOpportunities({
      keyword: target.kind === "keyword" ? target.value : undefined,
      naics: target.kind === "naics" ? target.value : undefined,
      agency: target.kind === "agency" ? target.value : undefined,
      limit: 10,
    }).catch((err): SkippedCheck => ({ check: "sam_opportunities", reason: `SAM.gov error for "${target.value}": ${err.message}` }));
    if (isSkipped(result)) {
      if (samKeyAvailable()) skipped.push(result);
      continue;
    }
    itemsScanned += result.length;
    for (const opp of result) {
      const existing = await db
        .execute(sql`SELECT id FROM bccs_fedcon_opportunities WHERE org_id = ${orgId} AND notice_id = ${opp.noticeId}`)
        .then((r) => (r as any).rows[0]);
      if (existing) continue;
      const dossier = await enrichOpportunityDossier(opp);
      await db.execute(sql`
        INSERT INTO bccs_fedcon_opportunities
          (org_id, notice_id, title, agency, naics, psc, set_aside, notice_type, posted_date, response_deadline, url, dossier)
        VALUES
          (${orgId}, ${opp.noticeId}, ${opp.title}, ${opp.agency}, ${opp.naics}, ${opp.psc}, ${opp.setAside},
           ${opp.noticeType}, ${opp.postedDate}, ${opp.responseDeadline?.slice(0, 10) ?? null}, ${opp.url}, ${JSON.stringify(dossier)}::jsonb)
        ON CONFLICT (org_id, notice_id) DO NOTHING
      `);
      candidates.push({
        findingType: "new_opportunity",
        severity: "low",
        title: `New matching opportunity: "${opp.title}" (${target.kind}: ${target.value})`,
        detail: { noticeId: opp.noticeId, agency: opp.agency, naics: opp.naics, setAside: opp.setAside, deadline: opp.responseDeadline, url: opp.url },
        relatedRecordId: `opportunity:${opp.noticeId}`,
      });
    }
  }

  /* 2 ── Vendor & contract dossiers + risk rubric */
  const vendorTargets = watchlist.filter((w) => ["vendor", "vendor_uei"].includes(w.kind));
  const contractTargets = watchlist.filter((w) => w.kind === "contract");

  // Gather awards per vendor for the concentration check.
  const vendorAwards = new Map<string, { target: (typeof watchlist)[number]; awards: UsaAward[] }>();
  for (const v of vendorTargets.slice(0, 15)) {
    try {
      const awards = await searchAwardsByRecipient({ recipient: v.value, limit: 25 });
      vendorAwards.set(v.value, { target: v, awards });
      itemsScanned += awards.length;
    } catch (err: any) {
      skipped.push({ check: "usaspending_awards", reason: `USAspending lookup failed for "${v.value}": ${err.message}` });
    }
  }

  const totalWatchedDollars = Array.from(vendorAwards.values())
    .reduce((sum, v) => sum + v.awards.reduce((s: number, a: UsaAward) => s + a.awardAmount, 0), 0);

  const now = Date.now();
  for (const { target, awards } of Array.from(vendorAwards.values())) {
    const vendorName = awards[0]?.recipientName ?? target.value;
    const vendorUei = awards[0]?.recipientUei ?? (target.kind === "vendor_uei" ? target.value : undefined);
    const vendorRef = `vendor:${(vendorUei ?? vendorName).toLowerCase()}`;
    // Vendor-level flags apply to every award of the vendor; award-level
    // flags are scoped to a single award. The vendor composite uses both.
    const vendorFlags: RiskFlag[] = [];
    const awardLevelFlags: RiskFlag[] = [];

    // Veto flag: active SAM exclusion/debarment.
    const exclusion = await checkSamExclusions({ uei: vendorUei ?? undefined, name: vendorName })
      .catch((err): SkippedCheck => ({ check: "sam_exclusions", reason: `Exclusion check failed for ${vendorName}: ${err.message}` }));
    if (isSkipped(exclusion)) {
      skipped.push(exclusion);
    } else if (!exclusion.excluded) {
      coverage.add(`excl|${vendorRef}`);
    } else if (exclusion.excluded) {
      vendorFlags.push({
        key: "activeExclusion", label: "Active SAM.gov exclusion/debarment", category: "Compliance",
        points: RUBRIC.activeExclusion.points, veto: true, detail: { records: exclusion.records },
      });
    }

    // Concentration >30% of watched portfolio dollars.
    const vendorDollars = awards.reduce((s, a) => s + a.awardAmount, 0);
    if (totalWatchedDollars > 0 && vendorAwards.size > 1 && vendorDollars / totalWatchedDollars > 0.3) {
      vendorFlags.push({
        key: "vendorConcentration", label: `Vendor holds ${(100 * vendorDollars / totalWatchedDollars).toFixed(0)}% of watched award dollars (>30%)`,
        category: "Portfolio", points: RUBRIC.vendorConcentration.points, veto: false,
        detail: { vendorDollars, totalWatchedDollars },
      });
    }

    // Per-award checks on the vendor's largest awards. Each award is scored
    // only from its own flags plus the vendor-level flags — never from
    // sibling awards' flags.
    for (const award of awards.slice(0, 5)) {
      let mods: { modificationCount: number | null; recentModsWithin90Days: number | null } = { modificationCount: null, recentModsWithin90Days: null };
      const thisAwardFlags: RiskFlag[] = [];
      coverage.add(`recompete|award:${award.awardId}`);
      if (award.generatedId) {
        try {
          const m = await getAwardModifications(award.generatedId, award.startDate);
          mods = m;
          coverage.add(`mods|award:${award.awardId}`);
          if (m.recentModsWithin90Days >= 3) {
            thisAwardFlags.push({
              key: "heavyEarlyModifications", label: `Contract ${award.awardId} modified ${m.recentModsWithin90Days}x within 90 days of award`,
              category: "Portfolio", points: RUBRIC.heavyEarlyModifications.points, veto: false,
              detail: { awardId: award.awardId, mods: m.recentModsWithin90Days },
            });
          } else if (m.modificationCount >= 10) {
            thisAwardFlags.push({
              key: "manyModifications", label: `Contract ${award.awardId} has ${m.modificationCount} modifications (scope-creep signal)`,
              category: "Portfolio", points: RUBRIC.manyModifications.points, veto: false,
              detail: { awardId: award.awardId, modificationCount: m.modificationCount },
            });
          }
        } catch { /* transactions endpoint failure is non-fatal for the award row */ }
      }
      // Recompete window: period of performance ends within 180 days.
      if (award.endDate) {
        const daysToEnd = Math.round((new Date(award.endDate).getTime() - now) / 86400000);
        if (daysToEnd > 0 && daysToEnd <= 180) {
          candidates.push({
            findingType: "recompete_window",
            severity: daysToEnd <= 90 ? "high" : "medium",
            title: `Recompete window: ${vendorName}'s contract ${award.awardId} ends in ${daysToEnd} day(s)`,
            detail: { awardId: award.awardId, endDate: award.endDate, agency: award.agency, awardAmount: award.awardAmount },
            relatedRecordId: `award:${award.awardId}`,
          });
          thisAwardFlags.push({
            key: "recompeteWindow", label: `Contract ${award.awardId} ends in ${daysToEnd} days`,
            category: "Portfolio", points: RUBRIC.recompeteWindow.points, veto: false,
            detail: { awardId: award.awardId, daysToEnd },
          });
        }
      }
      awardLevelFlags.push(...thisAwardFlags);
      const awardScoreFlags = [...vendorFlags, ...thisAwardFlags];
      const score = awardScoreFlags.reduce((s, f) => s + f.points, 0);
      const tier = tierFor(score, awardScoreFlags.some((f) => f.veto));
      await upsertAward(orgId, `${award.awardId}|${vendorRef}`, award, mods, awardScoreFlags, score, tier);
    }

    // Vendor scan completed for this vendor — its tier finding may be reconciled.
    coverage.add(`vendor|${vendorRef}`);

    // Vendor-level composite score and findings (vendor flags + all award flags).
    const flags = [...vendorFlags, ...awardLevelFlags];
    const uniqueFlags = flags.filter((f, i) => flags.findIndex((g) => g.key === f.key && JSON.stringify(g.detail) === JSON.stringify(f.detail)) === i);
    const compositeScore = uniqueFlags.reduce((s, f) => s + f.points, 0);
    const hasVeto = uniqueFlags.some((f) => f.veto);
    const tier = tierFor(compositeScore, hasVeto);

    if (hasVeto) {
      const excl = uniqueFlags.find((f) => f.key === "activeExclusion");
      candidates.push({
        findingType: "vendor_excluded",
        severity: "critical",
        title: `VETO FLAG: ${vendorName} has an active SAM.gov exclusion/debarment — Critical tier`,
        detail: { vendor: vendorName, uei: vendorUei, records: excl?.detail?.records, compositeScore, tier },
        relatedRecordId: vendorRef,
      });
    } else if (tier === "high" || tier === "moderate") {
      candidates.push({
        findingType: "vendor_risk_tier",
        severity: TIER_SEVERITY[tier],
        title: `${vendorName} risk tier is ${tier.toUpperCase()} (composite score ${compositeScore})`,
        detail: { vendor: vendorName, uei: vendorUei, compositeScore, tier, flags: uniqueFlags.map((f) => ({ key: f.key, label: f.label, points: f.points })) },
        relatedRecordId: vendorRef,
      });
    }
    for (const f of uniqueFlags.filter((x) => x.key === "heavyEarlyModifications")) {
      candidates.push({
        findingType: "heavy_modifications",
        severity: "high",
        title: `${vendorName}: ${f.label}`,
        detail: { ...f.detail, vendor: vendorName },
        relatedRecordId: `award:${(f.detail as any)?.awardId ?? target.value}`,
      });
    }

    await ensureManualChecklist(orgId, "vendor", vendorRef);
  }

  /* 3 ── Explicit tracked contracts (PIID) */
  for (const c of contractTargets.slice(0, 15)) {
    try {
      const awards = await searchAwardByPiid(c.value);
      itemsScanned += awards.length;
      for (const award of awards.slice(0, 2)) {
        let mods: { modificationCount: number | null; recentModsWithin90Days: number | null } = { modificationCount: null, recentModsWithin90Days: null };
        const flags: RiskFlag[] = [];
        if (award.generatedId) {
          try {
            const m = await getAwardModifications(award.generatedId, award.startDate);
            mods = m;
            coverage.add(`mods|award:${award.awardId}`);
            if (m.recentModsWithin90Days >= 3) {
              flags.push({ key: "heavyEarlyModifications", label: `Modified ${m.recentModsWithin90Days}x within 90 days of award`, category: "Portfolio", points: RUBRIC.heavyEarlyModifications.points, veto: false });
              candidates.push({
                findingType: "heavy_modifications", severity: "high",
                title: `Tracked contract ${award.awardId} was modified ${m.recentModsWithin90Days}x within 90 days of award`,
                detail: { awardId: award.awardId, vendor: award.recipientName, mods: m.recentModsWithin90Days },
                relatedRecordId: `award:${award.awardId}`,
              });
            }
          } catch { /* non-fatal */ }
        }
        if (award.endDate) {
          const daysToEnd = Math.round((new Date(award.endDate).getTime() - now) / 86400000);
          if (daysToEnd > 0 && daysToEnd <= 180) {
            flags.push({ key: "recompeteWindow", label: `Ends in ${daysToEnd} days`, category: "Portfolio", points: RUBRIC.recompeteWindow.points, veto: false });
            candidates.push({
              findingType: "recompete_window",
              severity: daysToEnd <= 90 ? "high" : "medium",
              title: `Recompete window: tracked contract ${award.awardId} ends in ${daysToEnd} day(s)`,
              detail: { awardId: award.awardId, endDate: award.endDate, vendor: award.recipientName },
              relatedRecordId: `award:${award.awardId}`,
            });
          }
        }
        coverage.add(`recompete|award:${award.awardId}`);
        const score = flags.reduce((s, f) => s + f.points, 0);
        await upsertAward(orgId, `${award.awardId}|tracked`, award, mods, flags, score, tierFor(score, false));
        await ensureManualChecklist(orgId, "award", `award:${award.awardId}`);
      }
      coverage.add(`contract|watch:${c.id}`);
      if (awards.length === 0) {
        candidates.push({
          findingType: "contract_not_found",
          severity: "low",
          title: `Tracked contract "${c.value}" was not found in USAspending award data`,
          detail: { piid: c.value, hint: "Verify the PIID; classified or very recent awards may not appear." },
          relatedRecordId: `watch:${c.id}`,
        });
      }
    } catch (err: any) {
      skipped.push({ check: "usaspending_piid", reason: `Lookup failed for contract "${c.value}": ${err.message}` });
    }
  }

  const { created, resolved } = await reconcileFindings(orgId, candidates, coverage);
  return { itemsScanned, newFindings: created, autoResolved: resolved, skippedChecks: skipped };
}

/* ── Runner ───────────────────────────────────────────────────────────────── */

export interface MonitorResult {
  itemsScanned: number;
  newFindings: number;
  autoResolved: number;
  skippedChecks: SkippedCheck[];
}

/**
 * Run the monitor. With a target org (manual run) it patrols just that org;
 * without one (scheduled) it patrols every org with watchlist entries,
 * writing one run row per org so telemetry never leaks across tenants.
 */
export async function runFederalContractsMonitor(targetOrgId?: string): Promise<MonitorResult> {
  let orgIds: string[];
  if (targetOrgId) {
    orgIds = [targetOrgId];
  } else {
    orgIds = await db
      .execute(sql`SELECT DISTINCT org_id FROM bccs_fedcon_watchlist`)
      .then((r) => (r as any).rows.map((row: any) => String(row.org_id)));
  }

  const totals: MonitorResult = { itemsScanned: 0, newFindings: 0, autoResolved: 0, skippedChecks: [] };
  for (const orgId of orgIds) {
    const runId = await startRun(AGENT_ID, orgId);
    try {
      const r = await patrolOrg(orgId);
      totals.itemsScanned += r.itemsScanned;
      totals.newFindings += r.newFindings;
      totals.autoResolved += r.autoResolved;
      totals.skippedChecks.push(...r.skippedChecks);

      const skippedNote = r.skippedChecks.length > 0
        ? ` ${r.skippedChecks.length} check(s) skipped: ${Array.from(new Set(r.skippedChecks.map((s) => s.reason))).join("; ")}.`
        : "";
      await finishRun(runId, {
        status: "success",
        itemsProcessed: r.itemsScanned,
        findingsCount: r.newFindings,
        summary: `Patrolled ${r.itemsScanned} contract record(s); ${r.newFindings} new finding(s), ${r.autoResolved} auto-resolved.${skippedNote}`,
      });
      await emitAgentEvent(
        AGENT_NAME,
        r.newFindings > 0 ? "flagged_records" : "monitoring_cycle",
        r.newFindings > 0
          ? `Federal contracts patrol flagged ${r.newFindings} new issue(s) — exclusions, modifications, or recompete windows need attention`
          : `Federal contracts patrol complete — ${r.itemsScanned} record(s) checked, no new issues`,
        orgId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[federal-contracts-monitor] patrol of org ${orgId} failed:`, error);
      await finishRun(runId, { status: "failed", summary: message });
      await emitAgentEvent(AGENT_NAME, "run_failed", `Federal contracts patrol failed: ${message}`, orgId);
      if (targetOrgId) throw error;
    }
  }
  return totals;
}

let monitorInterval: NodeJS.Timeout | null = null;

/** Boot hook: patrol immediately, then every 12 hours. */
export function startFederalContractsMonitor(intervalHours = 12): void {
  if (monitorInterval) return;
  runFederalContractsMonitor().catch((err) => console.error("[federal-contracts-monitor] initial patrol failed:", err));
  monitorInterval = setInterval(() => {
    runFederalContractsMonitor().catch((err) => console.error("[federal-contracts-monitor] scheduled patrol failed:", err));
  }, intervalHours * 60 * 60 * 1000);
}
