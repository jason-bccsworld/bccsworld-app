/**
 * The BCCS Agent Workforce registry.
 *
 * Every autonomous capability on the platform is a named agent with a mission,
 * a domain workspace page, a schedule, and full run telemetry. This registry is
 * the single source of truth for who the agents are; bccs_agent_runs records
 * what they did, agent_events is their live activity stream, and
 * bccs_agent_findings is where they raise issues for humans.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

export interface AgentDefinition {
  id: string;
  name: string;
  /** One-line mission statement shown on the Command Center. */
  mission: string;
  /** The page that is this agent's workspace. */
  domainPath: string;
  /** Human-readable schedule ("Every 6 hours", "On every upload", …). */
  schedule: string;
  /** What the agent does, as short capability bullets. */
  capabilities: string[];
  /** Whether a human can trigger a run from the Command Center. */
  manuallyRunnable: boolean;
  /** "org" agents work per-organization; "global" agents watch shared sources. */
  scope: "org" | "global";
}

export const AGENTS: AgentDefinition[] = [
  {
    id: "document-extraction",
    name: "Document Extraction Agent",
    mission: "Reads every uploaded document, extracts compliance data with AI, and auto-approves high-confidence records under GATE governance.",
    domainPath: "/documents",
    schedule: "On every upload",
    capabilities: [
      "OCR + GPT-4o field extraction per document type",
      "Confidence-gated auto-approval with blockchain anchoring",
      "Routes low-confidence documents to human review",
    ],
    manuallyRunnable: false,
    scope: "org",
  },
  {
    id: "extraction-learning",
    name: "Extraction Learning Agent",
    mission: "Studies every human correction and rewrites the extraction playbook so the same mistake is never made twice.",
    domainPath: "/ml-training",
    schedule: "After every human review",
    capabilities: [
      "Collects reviewer corrections as training feedback",
      "Distills correction patterns into versioned prompt guidance",
      "Feeds learned guidance into future extractions",
    ],
    manuallyRunnable: false,
    scope: "org",
  },
  {
    id: "regulatory-monitor",
    name: "Regulatory Monitoring Agent",
    mission: "Watches FAA and international regulatory sources for changes that affect your training operation.",
    domainPath: "/regulatory-alerts",
    schedule: "Every 24 hours",
    capabilities: [
      "Monitors eCFR and regulatory publications for updates",
      "Raises alerts with impact assessments on changes",
    ],
    manuallyRunnable: true,
    scope: "global",
  },
  {
    id: "faa-repository",
    name: "FAA Repository Agent",
    mission: "Keeps the FAA document repository current — every tracked order, AC, and regulation checked for new revisions.",
    domainPath: "/faa-repository",
    schedule: "Every 6 hours",
    capabilities: [
      "Polls eCFR and FAA document sources for revisions",
      "Tracks version history and flags updated documents",
    ],
    manuallyRunnable: true,
    scope: "global",
  },
  {
    id: "link-integrity",
    name: "Link Integrity Agent",
    mission: "Verifies every regulatory reference link stays live and points where it should — no silent dead links in your compliance evidence.",
    domainPath: "/link-monitor",
    schedule: "Every 4 hours",
    capabilities: [
      "Health-checks all monitored regulatory URLs",
      "Detects redirects, outages, and content drift",
    ],
    manuallyRunnable: true,
    scope: "global",
  },
  {
    id: "compliance-watchdog",
    name: "Compliance Watchdog Agent",
    mission: "Patrols your rosters around the clock — expiring instructor certificates and overdue student completions are caught before they become findings.",
    domainPath: "/instructors",
    schedule: "Every 12 hours",
    capabilities: [
      "Scans instructor certificate expiration and currency dates",
      "Flags students past their expected completion date",
      "Raises severity-ranked findings for human action",
    ],
    manuallyRunnable: true,
    scope: "org",
  },
  {
    id: "audit-readiness",
    name: "Audit Readiness Agent",
    mission: "Reviews your entire compliance posture the way an FAA inspector would, and tells you exactly where you stand before they do.",
    domainPath: "/audit-history",
    schedule: "On demand",
    capabilities: [
      "AI review of records, findings, and governance activity",
      "Produces a readiness score with prioritized gaps",
    ],
    manuallyRunnable: true,
    scope: "org",
  },
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** Live activity stream write — shared by every agent. */
export async function emitAgentEvent(
  agentName: string,
  eventType: string,
  message: string,
  orgId: string | null,
): Promise<void> {
  await db
    .execute(sql`
      INSERT INTO agent_events (agent_name, event_type, message, org_id)
      VALUES (${agentName}, ${eventType}, ${message}, ${orgId})
    `)
    .catch((err) => console.error("[agent-registry] agent event write failed:", err));
}

/** Open a run record; returns the run id (or null if telemetry write failed). */
export async function startRun(agentId: string, orgId: string | null): Promise<string | null> {
  try {
    const rows = await db
      .execute(sql`
        INSERT INTO bccs_agent_runs (agent_id, org_id, status)
        VALUES (${agentId}, ${orgId}, 'running')
        RETURNING id
      `)
      .then((r) => (r as any).rows);
    return rows[0]?.id ?? null;
  } catch (err) {
    console.error("[agent-registry] startRun failed:", err);
    return null;
  }
}

/** Close a run record with its outcome. */
export async function finishRun(
  runId: string | null,
  outcome: {
    status: "success" | "failed";
    itemsProcessed?: number;
    findingsCount?: number;
    summary?: string;
  },
): Promise<void> {
  if (!runId) return;
  await db
    .execute(sql`
      UPDATE bccs_agent_runs
      SET status = ${outcome.status},
          finished_at = NOW(),
          items_processed = ${outcome.itemsProcessed ?? 0},
          findings_count = ${outcome.findingsCount ?? 0},
          summary = ${outcome.summary ?? null}
      WHERE id = ${runId}
    `)
    .catch((err) => console.error("[agent-registry] finishRun failed:", err));
}

/**
 * In-memory concurrency guard for manual runs. In-process is enough: runs are
 * fire-and-forget inside this server, and a restart clears both the jobs and
 * the guard together.
 */
const runningAgents = new Set<string>();

export function tryAcquireRunLock(agentId: string, orgId: string | null): boolean {
  const key = `${agentId}:${orgId ?? "global"}`;
  if (runningAgents.has(key)) return false;
  runningAgents.add(key);
  return true;
}

export function releaseRunLock(agentId: string, orgId: string | null): void {
  runningAgents.delete(`${agentId}:${orgId ?? "global"}`);
}
