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
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

/** Reject decompression bombs before ExcelJS fully inflates the archive. */
async function assertZipWithinBounds(buffer: Buffer): Promise<void> {
  const tmp = path.join(os.tmpdir(), `xlsx-${crypto.randomBytes(6).toString("hex")}.zip`);
  fs.writeFileSync(tmp, buffer);
  try {
    // `unzip -l` lists uncompressed entry sizes without extracting.
    const { stdout } = await execAsync(`unzip -l "${tmp}"`, { maxBuffer: 10 * 1024 * 1024 });
    let total = 0;
    for (const line of stdout.split("\n")) {
      const m = line.match(/^\s*(\d+)\s+\d{2,4}-\d{2}-\d{2,4}/);
      if (m) total += Number(m[1]);
    }
    if (total > MAX_UNCOMPRESSED_BYTES) {
      throw new Error("This spreadsheet expands to an unreasonably large size and cannot be processed.");
    }
  } catch (err: any) {
    if (/unreasonably large/.test(String(err?.message))) throw err;
    // Not a readable zip at all — let ExcelJS produce the standard error path.
  } finally {
    fs.unlinkSync(tmp);
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
 * Parse the first worksheet into import items. Throws an Error with a
 * user-facing message (including ACCEPTED_COLUMNS_HELP) when the sheet
 * cannot be interpreted.
 */
export async function parseChecklistWorkbook(buffer: Buffer, filename: string): Promise<ImportedItem[]> {
  let workbook: ExcelJS.Workbook;
  try {
    workbook = await readWorkbook(buffer, filename);
  } catch (err: any) {
    if (/unreasonably large/.test(String(err?.message))) throw err;
    throw new Error("This file could not be read as a spreadsheet. Please upload a valid .xlsx, .xls, or .csv file.");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount === 0) {
    throw new Error(`The spreadsheet is empty. ${ACCEPTED_COLUMNS_HELP}`);
  }
  if (sheet.rowCount > MAX_PARSE_ROWS || sheet.columnCount > MAX_PARSE_COLS) {
    throw new Error(`The spreadsheet is too large (${sheet.rowCount} rows × ${sheet.columnCount} columns). The maximum is ${MAX_PARSE_ROWS} rows and ${MAX_PARSE_COLS} columns.`);
  }

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
  if (!headerRowIdx) {
    throw new Error(`Could not find a header row with a Description column. ${ACCEPTED_COLUMNS_HELP}`);
  }

  const items: ImportedItem[] = [];
  for (let r = headerRowIdx + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const description = columnMap.description !== undefined ? cellText(row.getCell(columnMap.description).value) : "";
    if (!description) continue;
    const number = columnMap.number !== undefined ? cellText(row.getCell(columnMap.number).value) : "";
    const reference = columnMap.reference !== undefined ? cellText(row.getCell(columnMap.reference).value) : "";
    const areaName = columnMap.areaName !== undefined ? cellText(row.getCell(columnMap.areaName).value) : "";
    items.push({
      number: number || `ITEM-${items.length + 1}`,
      description,
      reference,
      areaName: areaName || "Imported Checklist",
    });
  }
  if (items.length === 0) {
    throw new Error(`No checklist rows were found under the header row. ${ACCEPTED_COLUMNS_HELP}`);
  }
  return items;
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

export async function buildChecklistWorkbook(opts: {
  areas: ExportArea[];
  organization: ExportOrganization | null;
  manual: { filename: string; uploadedAt: string | Date | null } | null;
  generatedAt?: Date;
}): Promise<Buffer> {
  const { areas, organization, manual } = opts;
  const generatedAt = opts.generatedAt ?? new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BCCS Part 142 Checklist Report";
  workbook.created = generatedAt;

  const allItems = areas.flatMap((a) => a.items);
  const count = (st: string) => allItems.filter((i) => i.status === st).length;
  const aiCount = (v: string) => allItems.filter((i) => i.aiVerdict === v).length;
  const assessed = count("compliant") + count("non-compliant") + count("not-applicable");

  // Summary sheet
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ width: 34 }, { width: 60 }];
  const title = summary.addRow(["Part 142 Checklist Report"]);
  title.font = { bold: true, size: 16 };
  summary.addRow(["FAA Training Center Inspection Checklist & Job Aid — Auditor Report"]);
  summary.addRow([]);
  if (organization) {
    summary.addRow(["Organization", organization.name || ""]);
    if (organization.certificateNumber) summary.addRow(["Certificate No.", organization.certificateNumber]);
    if (organization.regulatoryAuthority) summary.addRow(["Regulatory authority", organization.regulatoryAuthority]);
  }
  summary.addRow(["Generated", generatedAt.toISOString()]);
  summary.addRow([
    "Operations manual",
    manual ? `${manual.filename}${manual.uploadedAt ? ` (uploaded ${new Date(manual.uploadedAt).toDateString()})` : ""}` : "None on file — AI review not performed",
  ]);
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
        evidenceCount: item.evidenceCount,
      });
    }
    ws.getColumn(2).alignment = { wrapText: true, vertical: "top" };
    for (const col of [5, 6, 8, 9]) ws.getColumn(col).alignment = { wrapText: true, vertical: "top" };
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
