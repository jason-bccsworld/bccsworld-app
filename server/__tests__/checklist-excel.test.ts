/**
 * Excel import/export unit tests for the Part 142 Checklist Report.
 */
import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { parseChecklistWorkbook, buildChecklistWorkbook, extractWorkbookText, sheetName, cellText, ACCEPTED_COLUMNS_HELP, MAX_PARSE_ROWS } from "../services/checklist-excel";

async function makeXlsx(rows: any[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Checklist");
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("parseChecklistWorkbook", () => {
  it("parses a well-formed sheet with flexible headers", async () => {
    const buf = await makeXlsx([
      ["Item Number", "Requirement Description", "Reference", "Area"],
      ["1-01", "Has enough instructors?", "142.13(a)", "Management"],
      ["1-02", "Certificate displayed?", "142.27(a)", "Management"],
      ["2-01", "Tspecs current?", "142.5(c)", "Training Specs"],
    ]);
    const { items, skippedSheets } = await parseChecklistWorkbook(buf, "checklist.xlsx");
    expect(skippedSheets).toEqual([]);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ number: "1-01", description: "Has enough instructors?", reference: "142.13(a)", areaName: "Management" });
    expect(items[2].areaName).toBe("Training Specs");
  });

  it("fills defaults when optional columns are absent", async () => {
    const buf = await makeXlsx([
      ["Description"],
      ["Only a description"],
    ]);
    const { items } = await parseChecklistWorkbook(buf, "min.xlsx");
    expect(items).toEqual([{ number: "ITEM-1", description: "Only a description", reference: "", areaName: "Imported Checklist" }]);
  });

  it("skips leading junk rows and blank rows", async () => {
    const buf = await makeXlsx([
      ["My Company Checklist"],
      [],
      ["No", "Description", "Ref"],
      ["1", "First item", "142.1"],
      [],
      ["2", "Second item", ""],
    ]);
    const { items } = await parseChecklistWorkbook(buf, "messy.xlsx");
    expect(items.map((i) => i.description)).toEqual(["First item", "Second item"]);
  });

  it("rejects a sheet with no description column, listing accepted columns", async () => {
    const buf = await makeXlsx([
      ["Foo", "Bar"],
      ["a", "b"],
    ]);
    await expect(parseChecklistWorkbook(buf, "bad.xlsx")).rejects.toThrow(ACCEPTED_COLUMNS_HELP);
  });

  it("rejects a file that is not a spreadsheet", async () => {
    await expect(parseChecklistWorkbook(Buffer.from("not a zip"), "fake.xlsx")).rejects.toThrow(/could not be read/i);
  });

  it("parses legacy binary .xls files (BIFF) like .xlsx", async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Item Number", "Description", "Reference", "Area"],
      ["1-01", "Has enough instructors?", "142.13(a)", "Management"],
      ["2-01", "Tspecs current?", "142.5(c)", "Training Specs"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklist");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xls" }) as Buffer; // real BIFF8 bytes
    expect(buf.slice(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]))).toBe(true); // CFB magic, not a zip
    const { items } = await parseChecklistWorkbook(buf, "legacy.xls");
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ number: "1-01", description: "Has enough instructors?", reference: "142.13(a)", areaName: "Management" });
    expect(items[1].areaName).toBe("Training Specs");
  });

  it("rejects a garbage file with a .xls extension", async () => {
    await expect(parseChecklistWorkbook(Buffer.from("definitely not BIFF"), "fake.xls")).rejects.toThrow(/could not be read/i);
  });

  it("rejects a malformed CFB container (valid magic, garbage body)", async () => {
    const evil = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(4096, 0x41)]);
    await expect(parseChecklistWorkbook(evil, "evil.xls")).rejects.toThrow(/could not be read/i);
  });

  it("rejects an .xls exceeding the hard parse row limit instead of exhausting resources", async () => {
    const XLSX = await import("xlsx");
    const rows: any[][] = [["Description"]];
    for (let i = 0; i <= MAX_PARSE_ROWS; i++) rows.push([`row ${i}`]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "S");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xls" }) as Buffer;
    await expect(parseChecklistWorkbook(buf, "huge.xls")).rejects.toThrow(/too large/i);
  });

  it("parses CSV files", async () => {
    const csv = Buffer.from("Number,Description,Reference,Area\n1-01,Item one,142.1,Area A\n1-02,Item two,,Area B\n");
    const { items } = await parseChecklistWorkbook(csv, "checklist.csv");
    expect(items).toHaveLength(2);
    expect(items[1]).toEqual({ number: "1-02", description: "Item two", reference: "", areaName: "Area B" });
  });

  it("parses an oversized sheet fully so route bounds can reject it", async () => {
    const rows: any[][] = [["Number", "Description", "Area"]];
    for (let i = 1; i <= 550; i++) rows.push([`X-${i}`, `Item ${i}`, `Area ${(i % 25) + 1}`]);
    const buf = await makeXlsx(rows);
    const { items } = await parseChecklistWorkbook(buf, "big.xlsx");
    expect(items).toHaveLength(550); // route-level MAX_IMPORT_ITEMS/AREAS rejects this
  });

  it("rejects sheets exceeding the hard parse row limit before iterating", async () => {
    const rows: any[][] = [["Description"]];
    for (let i = 0; i <= MAX_PARSE_ROWS; i++) rows.push([`row ${i}`]);
    const buf = await makeXlsx(rows);
    await expect(parseChecklistWorkbook(buf, "huge.xlsx")).rejects.toThrow(/too large/i);
  });

  it("imports every tab of a multi-sheet workbook, defaulting area to the tab name", async () => {
    const wb = new ExcelJS.Workbook();
    const a = wb.addWorksheet("Personnel");
    a.addRow(["Number", "Description"]);
    a.addRow(["1-01", "Enough instructors"]);
    const b = wb.addWorksheet("Facilities");
    b.addRow(["Number", "Description", "Area"]);
    b.addRow(["2-01", "Building adequate", "Custom Area"]);
    b.addRow(["2-02", "Simulators approved", ""]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const { items, skippedSheets } = await parseChecklistWorkbook(buf, "multi.xlsx");
    expect(skippedSheets).toEqual([]);
    expect(items).toHaveLength(3);
    expect(items[0].areaName).toBe("Personnel");
    expect(items[1].areaName).toBe("Custom Area"); // explicit Area column wins
    expect(items[2].areaName).toBe("Facilities");
  });

  it("extractWorkbookText renders sheets as headed pipe-separated text", async () => {
    const wb = new ExcelJS.Workbook();
    const a = wb.addWorksheet("Policies");
    a.addRow(["Topic", "Requirement"]);
    a.addRow(["Instructors", "Must hold valid certificates"]);
    const b = wb.addWorksheet("Facilities");
    b.addRow(["Building", "Must have fire exits"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const text = await extractWorkbookText(buf, "manual.xlsx");
    expect(text).toContain("## Policies");
    expect(text).toContain("Instructors | Must hold valid certificates");
    expect(text).toContain("## Facilities");
    expect(text).toContain("Building | Must have fire exits");
  });

  it("extractWorkbookText rejects a non-spreadsheet buffer", async () => {
    await expect(extractWorkbookText(Buffer.from("not a zip"), "fake.xlsx")).rejects.toThrow(/could not be read/i);
  });

  it("extractWorkbookText enforces the parse row bound", async () => {
    const rows: any[][] = [["Description"]];
    for (let i = 0; i <= MAX_PARSE_ROWS; i++) rows.push([`row ${i}`]);
    const buf = await makeXlsx(rows);
    await expect(extractWorkbookText(buf, "huge.xlsx")).rejects.toThrow(/too large/i);
  });

  it("extractWorkbookText bounds aggregate rows across many sheets", async () => {
    const wb = new ExcelJS.Workbook();
    // 3 sheets × 2000 rows each = 6000 rows total, each individually under the cap
    for (let s = 0; s < 3; s++) {
      const ws = wb.addWorksheet(`S${s}`);
      for (let i = 0; i < 2000; i++) ws.addRow([`row ${i}`]);
    }
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(extractWorkbookText(buf, "many-sheets.xlsx")).rejects.toThrow(/too large/i);
  });

  it("extractWorkbookText reads legacy .xls and CSV", async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Rule", "Detail"], ["R1", "Keep records current"]]), "S");
    const xls = XLSX.write(wb, { type: "buffer", bookType: "xls" }) as Buffer;
    expect(await extractWorkbookText(xls, "legacy.xls")).toContain("R1 | Keep records current");
    const csv = Buffer.from("Rule,Detail\nR2,Audit annually\n");
    expect(await extractWorkbookText(csv, "manual.csv")).toContain("R2 | Audit annually");
  });

  it("reports tabs that cannot be imported in skippedSheets", async () => {
    const wb = new ExcelJS.Workbook();
    const good = wb.addWorksheet("Checklist");
    good.addRow(["Number", "Description"]);
    good.addRow(["1-01", "An item"]);
    const junk = wb.addWorksheet("Notes");
    junk.addRow(["Just some prose with no header"]);
    const headerOnly = wb.addWorksheet("Empty Area");
    headerOnly.addRow(["Number", "Description"]);
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const { items, skippedSheets } = await parseChecklistWorkbook(buf, "mixed.xlsx");
    expect(items).toHaveLength(1);
    expect(skippedSheets).toEqual(["Notes", "Empty Area"]);
  });

  it("applies the parse row bound across all sheets combined", async () => {
    const wb = new ExcelJS.Workbook();
    for (let s = 0; s < 2; s++) {
      const ws = wb.addWorksheet(`S${s}`);
      ws.addRow(["Description"]);
      for (let i = 0; i < MAX_PARSE_ROWS / 2 + 10; i++) ws.addRow([`row ${i}`]);
    }
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(parseChecklistWorkbook(buf, "multibig.xlsx")).rejects.toThrow(/too large/i);
  });

  it("treats formula cells without a cached result as empty, never '[object Object]'", () => {
    expect(cellText({ formula: "A1+B1" } as any)).toBe("");
    expect(cellText({ formula: "A1", result: 42 } as any)).toBe("42");
    expect(cellText({ formula: "A1", result: { error: "#REF!" } } as any)).toBe("");
    expect(cellText({ sharedFormula: "A1" } as any)).toBe("");
    expect(cellText({ richText: [{ text: "a" }, { text: "b" }] } as any)).toBe("ab");
  });

  it("uses cached formula results as row values during parsing", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("S");
    ws.addRow(["Number", "Description"]);
    ws.addRow(["1-01", { formula: 'CONCAT("a","b")', result: "Computed item" }]);
    ws.addRow(["1-02", { formula: 'CONCAT("a","b")' }]); // no cached result → skipped
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    const { items } = await parseChecklistWorkbook(buf, "formulas.xlsx");
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("Computed item");
  });
});

describe("buildChecklistWorkbook", () => {
  it("produces a valid workbook with summary + per-area sheets", async () => {
    const buffer = await buildChecklistWorkbook({
      areas: [
        {
          name: "Management and Administration",
          description: "desc",
          items: [
            { number: "1-01", description: "Item", reference: "142.13", status: "compliant", comments: "ok", findings: "", aiVerdict: "covered", aiExcerpt: "quote", aiRemediation: "", aiSuggestedOperation: "The Training Manager keeps records.", aiStale: false, evidenceCount: 2 },
            { number: "1-02", description: "Item 2", reference: "", status: "pending", comments: "", findings: "", aiVerdict: null, aiExcerpt: null, aiRemediation: null, aiSuggestedOperation: null, aiStale: false, evidenceCount: 0 },
          ],
        },
        { name: "Invalid/Name: With[Bad]Chars that is way too long for excel sheets", description: "", items: [] },
      ],
      organization: { name: "Demo Flight School", certificateNumber: "TC-123", regulatoryAuthority: "faa" },
      manuals: [{ filename: "ops.pdf", uploadedAt: new Date().toISOString() }],
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    expect(wb.worksheets.map((w) => w.name)[0]).toBe("Summary");
    expect(wb.worksheets).toHaveLength(3);
    // Sheet names sanitized and length-limited
    for (const ws of wb.worksheets) {
      expect(ws.name.length).toBeLessThanOrEqual(31);
      expect(ws.name).not.toMatch(/[\\/*?:\[\]]/);
    }
    // Summary contains org identity
    const summaryText = JSON.stringify(wb.getWorksheet("Summary")!.getSheetValues());
    expect(summaryText).toContain("Demo Flight School");
    expect(summaryText).toContain("TC-123");
    // Area sheet has header + item rows with AI verdict
    const areaWs = wb.worksheets[1];
    expect(areaWs.getRow(1).getCell(1).value).toBe("Item");
    expect(areaWs.getRow(2).getCell(7).value).toBe("Covered by manual");
    expect(areaWs.getRow(2).getCell(11).value).toBe(2);
  });

  it("keeps duplicate area names unique as sheet names", () => {
    const used = new Set<string>();
    const a = sheetName("Same Area", used);
    const b = sheetName("Same Area", used);
    expect(a).not.toBe(b);
  });
});

describe("scoreTrendTextDated", () => {
  it("shows snapshot dates next to trend values", async () => {
    const { scoreTrendTextDated } = await import("../services/checklist-excel");
    const history = [
      { score: 62, reviewedItems: 10, createdAt: "2026-01-05T12:00:00Z" },
      { score: 91, reviewedItems: 12, createdAt: "2026-02-02T12:00:00Z" },
    ];
    expect(scoreTrendTextDated(history)).toBe("62% (Jan 5, 2026) → 91% (Feb 2, 2026)");
  });

  it("returns null for fewer than two snapshots and tolerates bad dates", async () => {
    const { scoreTrendTextDated } = await import("../services/checklist-excel");
    expect(scoreTrendTextDated([{ score: 62, reviewedItems: 10, createdAt: "2026-01-05" }])).toBeNull();
    expect(
      scoreTrendTextDated([
        { score: 62, reviewedItems: 10, createdAt: null },
        { score: 91, reviewedItems: 12, createdAt: "not-a-date" },
      ]),
    ).toBe("62% → 91%");
  });
});
