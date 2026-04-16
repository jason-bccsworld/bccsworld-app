import { db } from "../db";
import { sql } from "drizzle-orm";
import * as crypto from "crypto";

export interface FAADocument {
  id: number;
  source_type: string;
  source_id: string;
  title: string;
  description: string;
  source_url: string;
  check_url: string;
  last_checked_at: string | null;
  last_changed_at: string | null;
  amendment_date: string | null;
  content_hash: string | null;
  status: string;
  change_summary: string | null;
  priority: string;
  far_parts: string[];
  metadata: any;
}

const FAA_SEED_DOCUMENTS = [
  // 14 CFR Parts
  { type: 'cfr_part', id: '14-CFR-61', title: '14 CFR Part 61 – Certification: Pilots, FIs, Ground Instructors', description: 'Requirements for pilot, flight instructor, and ground instructor certificates and ratings.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-D/part-61', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'high', parts: ['61'] },
  { type: 'cfr_part', id: '14-CFR-91', title: '14 CFR Part 91 – General Operating and Flight Rules', description: 'General flight operating rules for all aircraft operations in US airspace.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'medium', parts: ['91'] },
  { type: 'cfr_part', id: '14-CFR-119', title: '14 CFR Part 119 – Certification: Air Carriers and Commercial Operators', description: 'Certification requirements for air carriers and commercial operators.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-119', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'high', parts: ['119'] },
  { type: 'cfr_part', id: '14-CFR-121', title: '14 CFR Part 121 – Operating Requirements: Domestic/Flag/Supplemental', description: 'Operating requirements for large aircraft airlines and cargo carriers.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'high', parts: ['121'] },
  { type: 'cfr_part', id: '14-CFR-135', title: '14 CFR Part 135 – Operating Requirements: Commuter and On-Demand', description: 'Operating requirements for commuter airlines and on-demand charter operators.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'high', parts: ['135'] },
  { type: 'cfr_part', id: '14-CFR-141', title: '14 CFR Part 141 – Pilot Schools', description: 'Certification and operating requirements for FAA-approved pilot training schools.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-141', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'critical', parts: ['141'] },
  { type: 'cfr_part', id: '14-CFR-142', title: '14 CFR Part 142 – Training Centers', description: 'Certification and operating requirements for FAA-approved aviation training centers.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-142', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'critical', parts: ['142'] },
  { type: 'cfr_part', id: '14-CFR-145', title: '14 CFR Part 145 – Repair Stations', description: 'Certification requirements for aircraft maintenance and repair stations.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'medium', parts: ['145'] },
  { type: 'cfr_part', id: '14-CFR-43', title: '14 CFR Part 43 – Maintenance, Preventive Maintenance, Rebuilding, and Alteration', description: 'Maintenance standards and requirements for all civil aircraft.', url: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43', checkUrl: 'https://www.ecfr.gov/api/versioner/v1/versions/title-14', priority: 'medium', parts: ['43'] },
  // FAA Orders (8900.1)
  { type: 'faa_order', id: 'FAA-8900.1-V2', title: 'FAA Order 8900.1 Volume 2 – Air Agency Certification', description: 'Guidance for certifying pilot schools, training centers, and air agencies (Parts 141 and 142).', url: 'https://www.faa.gov/documentLibrary/media/Order/FAAORDER8900.1CHG.pdf', checkUrl: 'https://www.faa.gov/regulations_policies/orders_notices/index.cfm/go/document.information/documentID/1036256', priority: 'critical', parts: ['141', '142'] },
  { type: 'faa_order', id: 'FAA-8900.1-V3', title: 'FAA Order 8900.1 Volume 3 – General Technical Administration', description: 'Technical administration guidance for FAA Aviation Safety Inspectors.', url: 'https://www.faa.gov/regulations_policies/orders_notices/', priority: 'high', parts: ['119', '121', '135'] },
  { type: 'faa_order', id: 'FAA-8900.1-V5', title: 'FAA Order 8900.1 Volume 5 – Airmen Certification', description: 'Guidance for airmen certification including pilot, mechanic, and parachute rigger applications.', url: 'https://www.faa.gov/regulations_policies/orders_notices/', priority: 'high', parts: ['61', '65'] },
  // SAFOs
  { type: 'safo', id: 'SAFO-22012', title: 'SAFO 22012 – Crew Resource Management Training Requirements', description: 'Clarifies CRM training requirements for Part 121 and Part 135 operators including simulator requirements.', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo/all_safos/media/2022/SAFO22012.pdf', priority: 'high', parts: ['121', '135'] },
  { type: 'safo', id: 'SAFO-23003', title: 'SAFO 23003 – Runway Incursion Prevention Program Updates', description: 'Updated guidance on runway safety procedures including hotspot awareness and LAHSO operations.', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo/all_safos/media/2023/SAFO23003.pdf', priority: 'high', parts: ['91', '121', '135', '141'] },
  { type: 'safo', id: 'SAFO-23005', title: 'SAFO 23005 – Qualification, Authorization, and Identification of Aviation Safety Inspectors', description: 'Updated requirements for ASI qualifications and identification procedures.', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo/all_safos/', priority: 'medium', parts: ['119', '141', '142'] },
  { type: 'safo', id: 'SAFO-24001', title: 'SAFO 24001 – Advanced Air Mobility Operations', description: 'Safety guidance for emerging AAM operations in controlled airspace.', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/safo/all_safos/', priority: 'medium', parts: ['91', '135'] },
  // InFOs
  { type: 'info', id: 'InFO-22019', title: 'InFO 22019 – Winter Operations Safety Reminder', description: 'Reminds pilots and operators of requirements for ground deicing and anti-icing procedures.', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/info/all_infos/media/2022/IN22019.pdf', priority: 'medium', parts: ['121', '135', '91'] },
  { type: 'info', id: 'InFO-23015', title: 'InFO 23015 – Training Requirements for Part 141 Pilot School Graduates', description: 'Clarification of training hour credit for Part 141 graduates seeking airline transport pilot certification.', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/info/all_infos/', priority: 'high', parts: ['141', '61'] },
  { type: 'info', id: 'InFO-24008', title: 'InFO 24008 – Electronic Flight Bag Usage in Training', description: 'Guidance on acceptable use of EFBs during training operations at Part 141/142 facilities.', url: 'https://www.faa.gov/other_visit/aviation_industry/airline_operators/airline_safety/info/all_infos/', priority: 'medium', parts: ['141', '142', '121'] },
  // Advisory Circulars
  { type: 'advisory_circular', id: 'AC-61-65J', title: 'AC 61-65J – Certification: Pilots and Flight and Ground Instructors', description: 'Revised guidance for pilot certificate applications and flight/ground instructor certification.', url: 'https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1042507', priority: 'high', parts: ['61'] },
  { type: 'advisory_circular', id: 'AC-120-51F', title: 'AC 120-51F – Crew Resource Management Training', description: 'Standards for developing, implementing, and evaluating CRM training programs.', url: 'https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-51F.pdf', priority: 'high', parts: ['121', '135'] },
  { type: 'advisory_circular', id: 'AC-141-1B', title: 'AC 141-1B – Pilot School Certification', description: 'Guidance for obtaining FAA certification for Part 141 pilot schools.', url: 'https://www.faa.gov/regulations_policies/advisory_circulars/', priority: 'critical', parts: ['141'] },
  { type: 'advisory_circular', id: 'AC-142-1A', title: 'AC 142-1A – Certification and Operation of Aviation Training Devices', description: 'Guidance for certifying and using flight simulation training devices (FSTDs) at Part 142 training centers.', url: 'https://www.faa.gov/regulations_policies/advisory_circulars/', priority: 'critical', parts: ['142'] },
  { type: 'advisory_circular', id: 'AC-60-28B', title: 'AC 60-28B – English Language Standard for an FAA Certificate', description: 'Guidance on the English language standard for FAA pilot and flight crew certificates.', url: 'https://www.faa.gov/regulations_policies/advisory_circulars/', priority: 'medium', parts: ['61', '121', '135'] },
];

class FAADocumentMonitorService {
  private isRunning = false;
  private intervalHandle: NodeJS.Timeout | null = null;
  private ecfrVersionCache: any = null;
  private ecfrVersionCacheAt: number = 0;

  async initialize() {
    await this.ensureTable();
    await this.seedDocuments();
    console.log('[FAA Monitor] Repository initialized with', FAA_SEED_DOCUMENTS.length, 'documents');
  }

  private async ensureTable() {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bccs_faa_repository (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(50) NOT NULL,
        source_id VARCHAR(100) NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        source_url TEXT NOT NULL,
        check_url TEXT,
        last_checked_at TIMESTAMP,
        last_changed_at TIMESTAMP,
        amendment_date VARCHAR(50),
        content_hash VARCHAR(100),
        status VARCHAR(20) DEFAULT 'current',
        change_summary TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        far_parts TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  private async seedDocuments() {
    for (const doc of FAA_SEED_DOCUMENTS) {
      const partsLiteral = `{${doc.parts.join(',')}}`;
      await db.execute(sql`
        INSERT INTO bccs_faa_repository (source_type, source_id, title, description, source_url, check_url, priority, far_parts, status)
        VALUES (
          ${doc.type}, ${doc.id}, ${doc.title}, ${doc.description},
          ${doc.url}, ${(doc as any).checkUrl || null}, ${doc.priority},
          ${partsLiteral}::text[], 'unknown'
        )
        ON CONFLICT (source_id) DO NOTHING
      `);
    }
  }

  async getECFRVersions(): Promise<Record<string, string>> {
    const now = Date.now();
    if (this.ecfrVersionCache && now - this.ecfrVersionCacheAt < 3600000) {
      return this.ecfrVersionCache;
    }
    try {
      const res = await fetch('https://www.ecfr.gov/api/versioner/v1/versions/title-14', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'BCCS-US Compliance Platform' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`eCFR API ${res.status}`);
      const data: any = await res.json();
      const versions: Record<string, string> = {};
      if (data?.content_versions) {
        for (const v of data.content_versions) {
          versions[String(v.part)] = v.amendment_date || v.date || '';
        }
      }
      this.ecfrVersionCache = versions;
      this.ecfrVersionCacheAt = now;
      return versions;
    } catch (err) {
      console.error('[FAA Monitor] eCFR API error:', (err as Error).message);
      return {};
    }
  }

  async checkDocument(doc: any, ecfrVersions: Record<string, string>) {
    const now = new Date();
    let newHash: string | null = null;
    let amendmentDate: string | null = doc.amendment_date || null;
    let status = doc.status || 'unknown';
    let changeSummary: string | null = null;

    if (doc.source_type === 'cfr_part') {
      const partNum = doc.source_id.replace('14-CFR-', '');
      const latestAmendment = ecfrVersions[partNum];
      if (latestAmendment) {
        newHash = crypto.createHash('sha256').update(latestAmendment).digest('hex').substring(0, 16);
        amendmentDate = latestAmendment;
        if (doc.content_hash && newHash !== doc.content_hash) {
          status = 'updated';
          changeSummary = `Amendment detected. New amendment date: ${latestAmendment}`;
        } else if (!doc.content_hash) {
          status = 'current';
        }
      }
    } else {
      try {
        const res = await fetch(doc.source_url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'BCCS-US Compliance Platform' },
          signal: AbortSignal.timeout(10000),
        });
        const lastMod = res.headers.get('last-modified') || '';
        const contentLength = res.headers.get('content-length') || '';
        const etag = res.headers.get('etag') || '';
        const hashInput = `${res.status}|${lastMod}|${contentLength}|${etag}`;
        newHash = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
        if (res.ok || res.status === 302 || res.status === 301) {
          if (doc.content_hash && newHash !== doc.content_hash) {
            status = 'updated';
            changeSummary = `Document metadata changed. Last-Modified: ${lastMod || 'unknown'}`;
          } else if (!doc.content_hash) {
            status = 'current';
          }
        } else {
          status = status === 'unknown' ? 'unknown' : doc.status;
        }
      } catch {
        status = status === 'unknown' ? 'unknown' : doc.status;
      }
    }

    const isChanged = doc.content_hash && newHash && newHash !== doc.content_hash;
    await db.execute(sql`
      UPDATE bccs_faa_repository SET
        last_checked_at = ${now.toISOString()},
        content_hash = ${newHash || doc.content_hash},
        amendment_date = ${amendmentDate},
        status = ${status},
        change_summary = ${changeSummary || doc.change_summary},
        last_changed_at = ${isChanged ? now.toISOString() : doc.last_changed_at},
        updated_at = NOW()
      WHERE source_id = ${doc.source_id}
    `);

    return isChanged;
  }

  async runCheck() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[FAA Monitor] Starting document check...');

    try {
      const result = await db.execute(sql`SELECT * FROM bccs_faa_repository ORDER BY priority DESC, source_type, source_id`);
      const docs = result.rows as any[];
      const ecfrVersions = await this.getECFRVersions();
      let changedCount = 0;

      for (const doc of docs) {
        const changed = await this.checkDocument(doc, ecfrVersions);
        if (changed) changedCount++;
        await new Promise(r => setTimeout(r, 200));
      }

      console.log(`[FAA Monitor] Check complete. ${docs.length} documents checked, ${changedCount} changes detected.`);
    } catch (err) {
      console.error('[FAA Monitor] Check error:', (err as Error).message);
    } finally {
      this.isRunning = false;
    }
  }

  startScheduledMonitoring(intervalHours = 6) {
    console.log(`[FAA Monitor] Scheduled monitoring started (every ${intervalHours}h)`);
    this.runCheck().catch(console.error);
    this.intervalHandle = setInterval(() => {
      this.runCheck().catch(console.error);
    }, intervalHours * 60 * 60 * 1000);
  }

  stopMonitoring() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private normalizeFarParts(raw: any): string[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      return raw.replace(/^\{|\}$/g, '').split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  private normalizeDoc(row: any): FAADocument {
    return { ...row, far_parts: this.normalizeFarParts(row.far_parts) };
  }

  async getDocuments(filters?: { type?: string; priority?: string; status?: string; search?: string }) {
    const rows = await db.execute(sql`SELECT * FROM bccs_faa_repository ORDER BY priority DESC, source_type, source_id`);
    let docs = (rows.rows as any[]).map(r => this.normalizeDoc(r));
    if (filters?.type && filters.type !== 'all') docs = docs.filter(d => d.source_type === filters.type);
    if (filters?.priority && filters.priority !== 'all') docs = docs.filter(d => d.priority === filters.priority);
    if (filters?.status && filters.status !== 'all') docs = docs.filter(d => d.status === filters.status);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      docs = docs.filter(d => d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q) || d.source_id.toLowerCase().includes(q));
    }
    return docs;
  }

  async getStats() {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status='current' THEN 1 END) as current_count,
        COUNT(CASE WHEN status='updated' THEN 1 END) as updated_count,
        COUNT(CASE WHEN status='unknown' THEN 1 END) as unknown_count,
        COUNT(CASE WHEN source_type='cfr_part' THEN 1 END) as cfr_parts,
        COUNT(CASE WHEN source_type='faa_order' THEN 1 END) as faa_orders,
        COUNT(CASE WHEN source_type='safo' THEN 1 END) as safos,
        COUNT(CASE WHEN source_type='info' THEN 1 END) as infos,
        COUNT(CASE WHEN source_type='advisory_circular' THEN 1 END) as acs,
        MAX(last_checked_at) as last_check_at
      FROM bccs_faa_repository
    `);
    return result.rows[0];
  }

  async getUpdateHistory() {
    const result = await db.execute(sql`
      SELECT source_id, title, source_type, status, change_summary, last_changed_at, amendment_date
      FROM bccs_faa_repository
      WHERE status = 'updated' OR last_changed_at IS NOT NULL
      ORDER BY last_changed_at DESC NULLS LAST
      LIMIT 50
    `);
    return result.rows;
  }
}

export const faaDocumentMonitor = new FAADocumentMonitorService();
