/**
 * Excel (.xlsx/.xls/.csv) support for the Part 142 Checklist Report:
 * - parseChecklistWorkbook: read an uploaded workbook/CSV into import items
 *   with flexible header detection. Legacy binary .xls (BIFF) files are
 *   converted to .xlsx in-memory via SheetJS before parsing.
 * - buildChecklistWorkbook: produce the auditor .xlsx report (summary sheet +
 *   one sheet per checklist area).
 *
 * Kept free of DB/route imports so it can be unit-tested directly.
 */
import ExcelJS from "exceljs";
import { Readable } from "stream";

export interface ImportedItem {
  number: string;
  description: string;
  reference: string;
  areaName: string;
}

export const ACCEPTED_COLUMNS_HELP =
  'Expected columns: "Item Number" (or Number/No/#), "Description" (or Requirement/Question), ' +
  'optional "Reference", optional "Area" (or Section/Category).';

const HEADER_MATCHERS: Array<{ field: keyof ImportedItem; test: (h: string) => boolean }> = [
  { field: "number", test: (h) => /^(item\s*)?(number|no\.?|num|#)$|^item$/i.test(h) },
  { field: "description", test: (h) => /desc|requirement|question|checklist\s*item|item\s*text/i.test(h) },
  { field: "reference", test: (h) => /^ref(erence)?s?$|regulation|cfr/i.test(h) },
  { field: "areaName", test: (h) => /area|section|category|chapter|group/i.test(h) },
];

export function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const v: any = value;
    if (v instanceof Date) return v.toISOString();
    if (typeof v.text === "string") return v.text.trim();
    if (Array.isArray(v.richText)) return v.richText.map((r: any) => r.text).join("").trim();
    // Formula cells: use only the cached scalar result; a formula with no
    // cached result (or an error result) must be treated as empty, never
    // stringified into "[object Object]".
    if ("formula" in v || "sharedFormula" in v || "result" in v) {
      const r = v.result;
      if (r === null || r === undefined) return "";
      if (typeof r === "object") return r instanceof Date ? r.toISOString() : "";
      return String(r).trim();
    }
    return "";
  }
  return String(value).trim();
}

/** Pre-parse resource bounds for uploaded workbooks. */
export const MAX_PARSE_ROWS = 5000;
export const MAX_PARSE_COLS = 100;

/** Max total uncompressed size of an uploaded .xlsx archive (zip-bomb guard). */
export const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

/** Max total characters extracted from a spreadsheet used as a reference document. */
export const MAX_EXTRACT_CHARS = 2_000_000;

/** Reject decompression bombs before ExcelJS fully inflates the archive. */
async function assertZipWithinBounds(buffer: Buffer): Promise<void> {
  try {
    // Read declared uncompressed entry sizes from the zip metadata in-process
    // (no external `unzip` binary — unavailable on serverless hosts). JSZip's
    // loadAsync parses the central directory without inflating entry data.
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    let total = 0;
    for (const name of Object.keys(zip.files)) {
      const entry: any = zip.files[name];
      total += Number(entry?._data?.uncompressedSize) || 0;
    }
    if (total > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("This spreadsheet expands to an unreasonably large size and cannot be processed.");
    }
  } catch (err: any) {
    if (/unreasonably large/.test(String(err?.message))) throw err;
    // Not a readable zip at all — let ExcelJS produce the standard error path.
  }
}

/**
 * Convert a legacy binary .xls (BIFF) workbook into an .xlsx buffer using
 * SheetJS, so the rest of the pipeline (ExcelJS parsing, header detection,
 * bounds) applies unchanged. Throws when the buffer is not a readable .xls.
 */
async function convertXlsToXlsx(buffer: Buffer): Promise<Buffer> {
  // Require the CFB container magic (D0 CF 11 E0) so SheetJS's lenient
  // plain-text fallback cannot silently accept a non-spreadsheet file.
  if (buffer.length < 8 || !buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))) {
    throw new Error("not a legacy .xls (CFB) file");
  }
  const XLSX = await import("xlsx");
  // sheetRows bounds how much row data SheetJS materializes from a hostile
  // BIFF stream; one row past MAX_PARSE_ROWS so the standard "too large"
  // rejection still triggers downstream instead of silently truncating.
  const legacy = XLSX.read(buffer, { type: "buffer", dense: true, sheetRows: MAX_PARSE_ROWS + 1 });
  if (!legacy.SheetNames.length) throw new Error("empty .xls workbook");
  const out = XLSX.write(legacy, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
  if (out.length > MAX_UNCOMPRESSED_BYTES) {
    throw new Error("This spreadsheet expands to an unreasonably large size and cannot be processed.");
  }
  return out;
}

async function readWorkbook(buffer: Buffer, filename: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  if (/\.csv$/i.test(filename)) {
    await workbook.csv.read(Readable.from(buffer));
  } else if (/\.xls$/i.test(filename)) {
    // Legacy BIFF: convert to OOXML in-memory, then load normally. The
    // converted archive is still derived entirely from hostile input, so it
    // goes through the same zip-expansion guard as a direct .xlsx upload.
    const converted = await convertXlsToXlsx(buffer);
    await assertZipWithinBounds(converted);
    await workbook.xlsx.load(converted as any);
  } else {
    await assertZipWithinBounds(buffer);
    await workbook.xlsx.load(buffer as any);
  }
  return workbook;
}

/**
 * Extract the textual content of a spreadsheet (.xlsx/.xls/.csv) as plain
 * text for use as an operations-manual reference document. Goes through the
 * same hardened loader as checklist imports (zip-bomb guard, CFB magic check
 * and in-memory conversion for legacy .xls, row/column parse bounds).
 * Each sheet is emitted with a "## <sheet name>" heading; rows become
 * pipe-separated lines with empty cells collapsed.
 */
export async function extractWorkbookText(buffer: Buffer, filename: string): Promise<string> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = await readWorkbook(buffer, filename);
  } catch (err: any) {
    if (/unreasonably large/.test(String(err?.message))) throw err;
    throw new Error("This file could not be read as a spreadsheet. Please upload a valid .xlsx, .xls, or .csv file.");
  }
  const parts: string[] = [];
  // Aggregate bounds across the whole workbook: per-sheet caps alone would
  // let a many-sheet upload amplify into an unbounded amount of stored text.
  let totalRows = 0;
  let totalChars = 0;
  const tooLarge = () =>
    new Error(
      `This spreadsheet is too large to use as a reference document (max ${MAX_PARSE_ROWS} rows / ${Math.floor(MAX_EXTRACT_CHARS / 1000)}k characters of text across all sheets).`,
    );
  for (const sheet of workbook.worksheets) {
    if (sheet.state && sheet.state !== "visible") continue;
    if (sheet.rowCount > MAX_PARSE_ROWS || sheet.columnCount > MAX_PARSE_COLS) throw tooLarge();
    totalRows += sheet.rowCount;
    if (totalRows > MAX_PARSE_ROWS) throw tooLarge();
    const lines: string[] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const text = cellText(cell.value);
        if (text) cells.push(text);
      });
      if (cells.length) {
        const line = cells.join(" | ");
        totalChars += line.length;
        lines.push(line);
      }
    });
    if (totalChars > MAX_EXTRACT_CHARS) throw tooLarge();
    if (lines.length) parts.push(`## ${sheet.name}\n${lines.join("\n")}`);
  }
  return parts.join("\n\n").trim();
}

export interface ParsedChecklist {
  items: ImportedItem[];
  /** Names of worksheets that could not be imported (no header row / no data rows). */
  skippedSheets: string[];
}

/** Parse a single worksheet. Returns null when no header row / no data rows. */
function parseSheet(sheet: ExcelJS.Worksheet, defaultAreaName: string, startIndex: number): ImportedItem[] | null {
  // Find the header row: first row (within the top 10) where a description
  // column can be identified.
  let headerRowIdx = 0;
  let columnMap: Partial<Record<keyof ImportedItem, number>> = {};
  const maxScan = Math.min(sheet.rowCount, 10);
  for (let r = 1; r <= maxScan; r++) {
    const row = sheet.getRow(r);
    const map: Partial<Record<keyof ImportedItem, number>> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const text = cellText(cell.value);
      if (!text) return;
      for (const m of HEADER_MATCHERS) {
        if (map[m.field] === undefined && m.test(text)) {
          map[m.field] = col;
          break;
        }
      }
    });
    if (map.description !== undefined) {
      headerRowIdx = r;
      columnMap = map;
      break;
    }
  }
  if (!headerRowIdx) return null;

  const items: ImportedItem[] = [];
  for (let r = headerRowIdx + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const description = columnMap.description !== undefined ? cellText(row.getCell(columnMap.description).value) : "";
    if (!description) continue;
    const number = columnMap.number !== undefined ? cellText(row.getCell(columnMap.number).value) : "";
    const reference = columnMap.reference !== undefined ? cellText(row.getCell(columnMap.reference).value) : "";
    const areaName = columnMap.areaName !== undefined ? cellText(row.getCell(columnMap.areaName).value) : "";
    items.push({
      number: number || `ITEM-${startIndex + items.length + 1}`,
      description,
      reference,
      areaName: areaName || defaultAreaName,
    });
  }
  return items.length ? items : null;
}

/**
 * Parse every worksheet into import items. Multi-tab workbooks import each
 * tab; a tab without a recognizable header/data is reported in
 * `skippedSheets` rather than silently dropped. Rows on a multi-sheet
 * workbook default their area to the tab name so each tab becomes an area.
 * Throws an Error with a user-facing message (including
 * ACCEPTED_COLUMNS_HELP) when nothing in the file can be interpreted.
 */
export interface ParseOptions {
  /** Area name for rows without an Area column on a single-sheet file
   * (multi-sheet workbooks still default to the tab name). */
  defaultAreaName?: string;
  /** Starting offset for auto-generated ITEM-N numbers (multi-file imports). */
  itemNumberOffset?: number;
}

export async function parseChecklistWorkbook(buffer: Buffer, filename: string, opts: ParseOptions = {}): Promise<ParsedChecklist> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = await readWorkbook(buffer, filename);
  } catch (err: any) {
    if (/unreasonably large/.test(String(err?.message))) throw err;
    throw new Error("This file could not be read as a spreadsheet. Please upload a valid .xlsx, .xls, or .csv file.");
  }
  const sheets = workbook.worksheets.filter((ws) => ws && ws.rowCount > 0);
  if (sheets.length === 0) {
    throw new Error(`The spreadsheet is empty. ${ACCEPTED_COLUMNS_HELP}`);
  }
  // Bounds apply across the whole workbook so multiple tabs cannot multiply
  // the parse workload past the single-sheet limits.
  const totalRows = sheets.reduce((s, ws) => s + ws.rowCount, 0);
  const maxCols = Math.max(...sheets.map((ws) => ws.columnCount));
  if (totalRows > MAX_PARSE_ROWS || maxCols > MAX_PARSE_COLS) {
    throw new Error(`The spreadsheet is too large (${totalRows} rows × ${maxCols} columns). The maximum is ${MAX_PARSE_ROWS} rows and ${MAX_PARSE_COLS} columns.`);
  }

  const multiSheet = sheets.length > 1;
  const items: ImportedItem[] = [];
  const skippedSheets: string[] = [];
  const offset = opts.itemNumberOffset || 0;
  for (const sheet of sheets) {
    // On a multi-tab workbook, rows without an Area column fall back to the
    // tab name so each tab imports as its own inspection area.
    const defaultAreaName = multiSheet
      ? (sheet.name || "Imported Checklist")
      : (opts.defaultAreaName || "Imported Checklist");
    const parsed = parseSheet(sheet, defaultAreaName, offset + items.length);
    if (parsed) items.push(...parsed);
    else skippedSheets.push(sheet.name || `Sheet ${skippedSheets.length + 1}`);
  }
  if (items.length === 0) {
    if (skippedSheets.length > 0 && sheets.some((s) => {
      // Distinguish "no header anywhere" from "header but no rows" for the
      // single-sheet error messages admins already know.
      const p = parseSheetHeaderOnly(s);
      return p;
    })) {
      throw new Error(`No checklist rows were found under the header row. ${ACCEPTED_COLUMNS_HELP}`);
    }
    throw new Error(`Could not find a header row with a Description column. ${ACCEPTED_COLUMNS_HELP}`);
  }
  return { items, skippedSheets };
}

/** True when the sheet has a detectable header row (Description column). */
function parseSheetHeaderOnly(sheet: ExcelJS.Worksheet): boolean {
  const maxScan = Math.min(sheet.rowCount, 10);
  for (let r = 1; r <= maxScan; r++) {
    let found = false;
    sheet.getRow(r).eachCell({ includeEmpty: false }, (cell) => {
      const text = cellText(cell.value);
      if (text && HEADER_MATCHERS[1].test(text)) found = true;
    });
    if (found) return true;
  }
  return false;
}

/* ── Export ─────────────────────────────────────────────────────────────── */

export interface ExportItem {
  number: string;
  description: string;
  reference: string;
  status: string;
  comments: string;
  findings: string;
  aiVerdict: string | null;
  aiExcerpt: string | null;
  aiRemediation: string | null;
  aiSuggestedOperation: string | null;
  aiStale: boolean;
  evidenceCount: number;
}

export interface ExportArea {
  name: string;
  description: string;
  items: ExportItem[];
}

export interface ExportOrganization {
  name: string | null;
  certificateNumber: string | null;
  regulatoryAuthority: string | null;
}

export interface ExportPolicy {
  title: string;
  body: string;
  status: string;
  itemNumber: string | null;
  manualFilename: string | null;
  revision: number | null;
  createdBy: string | null;
  createdAt: string | Date | null;
}

/**
 * AI coverage score across items with a current (non-stale) AI verdict:
 * covered = full credit, partial = half, not addressed = none.
 * Returns null when no current verdicts exist (score would be meaningless).
 */
export function aiCoverageScore(items: { aiVerdict: string | null; aiStale: boolean }[]): number | null {
  const reviewed = items.filter((i) => i.aiVerdict && !i.aiStale);
  if (reviewed.length === 0) return null;
  const credit = reviewed.reduce((s, i) => s + (i.aiVerdict === "covered" ? 1 : i.aiVerdict === "partial" ? 0.5 : 0), 0);
  return Math.round((credit / reviewed.length) * 100);
}

const VERDICT_LABELS: Record<string, string> = {
  covered: "Covered by manual",
  partial: "Partially covered",
  not_addressed: "Not addressed",
};

/** Excel sheet names: max 31 chars, no \\ / * ? : [ ] and must be unique. */
export function sheetName(raw: string, used: Set<string>): string {
  let base = raw.replace(/[\\/*?:\[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Area";
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${n++})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

export interface ScoreSnapshot {
  score: number;
  reviewedItems: number;
  createdAt: string | Date | null;
}

/** "62% → 78% → 91%" over the last few snapshots (oldest → newest). */
export function scoreTrendText(history: ScoreSnapshot[], maxPoints = 5): string | null {
  if (history.length < 2) return null;
  return history.slice(-maxPoints).map((s) => `${s.score}%`).join(" → ");
}

/** Short snapshot date, e.g. "Jan 5, 2026"; empty when the date is missing/invalid. */
export function snapshotDateText(createdAt: string | Date | null): string {
  if (!createdAt) return "";
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Dated trend, e.g. "62% (Jan 5, 2026) → 91% (Feb 2, 2026)" — snapshot dates next to values. */
export function scoreTrendTextDated(history: ScoreSnapshot[], maxPoints = 5): string | null {
  if (history.length < 2) return null;
  return history
    .slice(-maxPoints)
    .map((s) => {
      const d = snapshotDateText(s.createdAt);
      return d ? `${s.score}% (${d})` : `${s.score}%`;
    })
    .join(" → ");
}

export async function buildChecklistWorkbook(opts: {
  areas: ExportArea[];
  organization: ExportOrganization | null;
  manuals: { filename: string; uploadedAt: string | Date | null }[];
  policies?: ExportPolicy[];
  scoreHistory?: ScoreSnapshot[];
  generatedAt?: Date;
}): Promise<Buffer> {
  const { areas, organization, manuals, policies = [], scoreHistory = [] } = opts;
  const generatedAt = opts.generatedAt ?? new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BCCS Part Checklist Report";
  workbook.created = generatedAt;

  const allItems = areas.flatMap((a) => a.items);
  const count = (st: string) => allItems.filter((i) => i.status === st).length;
  const aiCount = (v: string) => allItems.filter((i) => i.aiVerdict === v).length;
  const assessed = count("compliant") + count("non-compliant") + count("not-applicable");

  // Summary sheet
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 34 }, { width: 60 }];
  const title = summary.addRow(["Part Checklist Report"]);
  title.font = { bold: true, size: 16 };
  summary.addRow(["FAA Training Center Inspection Checklist & Job Aid — Auditor Report"]);
  summary.addRow([]);
  if (organization) {
    summary.addRow(["Organization", organization.name || ""]);
    if (organization.certificateNumber) summary.addRow(["Certificate No.", organization.certificateNumber]);
    if (organization.regulatoryAuthority) summary.addRow(["Regulatory authority", organization.regulatoryAuthority]);
  }
  summary.addRow(["Generated", generatedAt.toISOString()]);
  if (manuals.length === 0) {
    summary.addRow(["Operations manuals", "None on file — AI review not performed"]);
  } else {
    manuals.forEach((m, i) => {
      summary.addRow([
        i === 0 ? `Operations manual${manuals.length > 1 ? "s" : ""}` : "",
        `${m.filename}${m.uploadedAt ? ` (uploaded ${new Date(m.uploadedAt).toDateString()})` : ""}`,
      ]);
    });
  }
  summary.addRow([]);
  const statsHeader = summary.addRow(["Completion statistics"]);
  statsHeader.font = { bold: true };
  summary.addRow(["Total items", allItems.length]);
  summary.addRow(["Compliant", count("compliant")]);
  summary.addRow(["Non-compliant", count("non-compliant")]);
  summary.addRow(["Not applicable", count("not-applicable")]);
  summary.addRow(["Pending", count("pending")]);
  summary.addRow(["Assessed", `${allItems.length ? Math.round((assessed / allItems.length) * 100) : 0}%`]);
  if (allItems.some((i) => i.aiVerdict)) {
    summary.addRow([]);
    const aiHeader = summary.addRow(["AI manual review"]);
    aiHeader.font = { bold: true };
    summary.addRow(["Covered by manual", aiCount("covered")]);
    summary.addRow(["Partially covered", aiCount("partial")]);
    summary.addRow(["Not addressed", aiCount("not_addressed")]);
    const score = aiCoverageScore(allItems);
    if (score !== null) {
      summary.addRow(["AI coverage score", `${score}% (covered = full credit, partial = half; current verdicts only)`]);
    }
    const trend = scoreTrendTextDated(scoreHistory);
    if (trend) {
      summary.addRow(["AI coverage score trend", `${trend} (snapshots recorded when an AI review completes)`]);
    }
  }

  // One sheet per area
  const usedNames = new Set<string>(["summary"]);
  for (const area of areas) {
    const ws = workbook.addWorksheet(sheetName(area.name, usedNames));
    ws.columns = [
      { header: "Item", key: "number", width: 10 },
      { header: "Requirement", key: "description", width: 70 },
      { header: "Reference", key: "reference", width: 28 },
      { header: "Status", key: "status", width: 16 },
      { header: "Comments", key: "comments", width: 40 },
      { header: "Findings", key: "findings", width: 40 },
      { header: "AI Verdict", key: "aiVerdict", width: 22 },
      { header: "AI Manual Excerpt", key: "aiExcerpt", width: 50 },
      { header: "AI Suggested Remediation", key: "aiRemediation", width: 50 },
      { header: "AI Suggested Operation", key: "aiSuggestedOperation", width: 60 },
      { header: "Evidence Files", key: "evidenceCount", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const item of area.items) {
      const verdict = item.aiVerdict
        ? (VERDICT_LABELS[item.aiVerdict] || item.aiVerdict) + (item.aiStale ? " (stale — previous manual)" : "")
        : "";
      ws.addRow({
        number: item.number,
        description: item.description,
        reference: item.reference,
        status: item.status.replace("-", " "),
        comments: item.comments,
        findings: item.findings,
        aiVerdict: verdict,
        aiExcerpt: item.aiExcerpt || "",
        aiRemediation: item.aiRemediation || "",
        aiSuggestedOperation: item.aiSuggestedOperation || "",
        evidenceCount: item.evidenceCount,
      });
    }
    ws.getColumn(2).alignment = { wrapText: true, vertical: "top" };
    for (const col of [5, 6, 8, 9, 10]) ws.getColumn(col).alignment = { wrapText: true, vertical: "top" };
  }

  // Enforcement policies sheet (present only when policies exist)
  if (policies.length > 0) {
    const ws = workbook.addWorksheet(sheetName("Enforcement Policies", usedNames));
    ws.columns = [
      { header: "Checklist Item", key: "itemNumber", width: 14 },
      { header: "Policy Title", key: "title", width: 40 },
      { header: "Status", key: "status", width: 12 },
      { header: "Policy", key: "body", width: 90 },
      { header: "Manual / Revision", key: "manual", width: 30 },
      { header: "Created By", key: "createdBy", width: 26 },
      { header: "Created", key: "createdAt", width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    for (const p of policies) {
      ws.addRow({
        itemNumber: p.itemNumber || "",
        title: p.title,
        status: p.status,
        body: p.body,
        manual: p.manualFilename ? `${p.manualFilename}${p.revision ? ` (Rev ${p.revision})` : ""}` : "",
        createdBy: p.createdBy || "",
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
      });
    }
    ws.getColumn(4).alignment = { wrapText: true, vertical: "top" };
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
