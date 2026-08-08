import { describe, it, expect } from "vitest";
import { chunkText, selectChunks, selectExcerpts, batchItems, promptCoverage, MAX_EXCERPT_CHARS, CHUNK_SIZE } from "../services/checklist-review-utils";

describe("promptCoverage", () => {
  it("reports full coverage when text fits within the source-text capacity", () => {
    expect(promptCoverage(0)).toEqual({ ratio: 1, limited: false, maxExcerptChars: MAX_EXCERPT_CHARS });
    expect(promptCoverage(MAX_EXCERPT_CHARS)).toEqual({ ratio: 1, limited: false, maxExcerptChars: MAX_EXCERPT_CHARS });
  });

  it("flags limited coverage as soon as text exceeds the capacity", () => {
    const c = promptCoverage(MAX_EXCERPT_CHARS + 1);
    expect(c.limited).toBe(true);
    expect(c.ratio).toBeLessThan(1);
  });

  it("reports the fraction that fits for much larger manual sets", () => {
    const c = promptCoverage(MAX_EXCERPT_CHARS * 5);
    expect(c.ratio).toBeCloseTo(0.2);
    expect(c.limited).toBe(true);
  });
});

describe("selectExcerpts measured coverage", () => {
  const items = ["instructor curriculum regulation requirements records"];

  it("fully consults a manual of many small paragraph chunks when under the capacity", () => {
    // 16 chunks of ~1,000 chars (paragraph-preserving chunking output):
    // 16,000 chars < 18,000, so ALL of it must be selected — the old
    // 12-chunk cap must not silently exclude ~25% of the manual.
    const entries = Array.from({ length: 16 }, (_, i) => ({
      text: `regulation instructor curriculum ${i} ` + "x".repeat(960),
      source: "manual.pdf",
    }));
    const totalChars = entries.reduce((s, e) => s + e.text.length, 0);
    expect(totalChars).toBeLessThan(MAX_EXCERPT_CHARS);
    const { excerpts, selectedSourceChars } = selectExcerpts(entries, items);
    expect(excerpts.length).toBe(16);
    expect(selectedSourceChars).toBe(totalChars);
    expect(promptCoverage(totalChars).limited).toBe(false); // no warning — correctly
  });

  it("long filenames never eat into the source-text budget", () => {
    const longName = "an-extremely-long-operations-manual-filename-".repeat(5) + ".pdf";
    const entries = Array.from({ length: 12 }, (_, i) => ({
      text: `regulation instructor curriculum ${i} ` + "x".repeat(CHUNK_SIZE - 60),
      source: longName,
    }));
    const totalChars = entries.reduce((s, e) => s + e.text.length, 0);
    expect(totalChars).toBeLessThan(MAX_EXCERPT_CHARS);
    const { selectedSourceChars } = selectExcerpts(entries, items);
    expect(selectedSourceChars).toBe(totalChars); // labels excluded from budget
  });

  it("selects ALL of a manual made of many tiny paragraph chunks when under the capacity", () => {
    // 100 short paragraphs (~100 chars each, ~10k total): no chunk-count cap
    // may exclude any of them while the total fits the source-char ceiling.
    const entries = Array.from({ length: 100 }, (_, i) => ({
      text: `regulation instructor curriculum paragraph ${i} ` + "x".repeat(55),
      source: "manual.pdf",
    }));
    const totalChars = entries.reduce((s, e) => s + e.text.length, 0);
    expect(totalChars).toBeLessThan(MAX_EXCERPT_CHARS);
    const { excerpts, selectedSourceChars } = selectExcerpts(entries, items);
    expect(excerpts.length).toBe(100);
    expect(selectedSourceChars).toBe(totalChars);
    expect(promptCoverage(totalChars).limited).toBe(false); // warning agrees: fully consultable
  });

  it("measures partial coverage on the raw source-text basis when over capacity", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({
      text: `regulation instructor curriculum ${i} ` + "x".repeat(CHUNK_SIZE - 60),
      source: i < 10 ? "vol1.pdf" : "vol2.pdf",
    }));
    const totalChars = entries.reduce((s, e) => s + e.text.length, 0);
    expect(totalChars).toBeGreaterThan(MAX_EXCERPT_CHARS);
    const { excerpts, selectedSourceChars } = selectExcerpts(entries, items);
    expect(selectedSourceChars).toBeLessThanOrEqual(MAX_EXCERPT_CHARS);
    expect(selectedSourceChars).toBe(excerpts.reduce((s, e) => s + e.text.length, 0));
    expect(promptCoverage(totalChars).limited).toBe(true); // static warning agrees
    // Every document still represented.
    expect(excerpts.some((e) => e.source === "vol1.pdf")).toBe(true);
    expect(excerpts.some((e) => e.source === "vol2.pdf")).toBe(true);
  });
});

describe("selectChunks per-document representation", () => {
  it("guarantees every document at least one chunk even when one document dominates relevance", () => {
    // Dominant document: 20 highly relevant chunks (more than maxChunks=12).
    const dominant = Array.from({ length: 20 }, (_, i) =>
      `[dominant.pdf] Section ${i}: instructor curriculum regulation requirements records qualification evaluation ${i}`
    );
    // Second document: chunks with little keyword overlap.
    const other = ["[vol2.pdf] Miscellaneous appendix housekeeping notes."];
    const chunks = [...dominant, ...other];
    const groups = [...dominant.map(() => "dominant.pdf"), ...other.map(() => "vol2.pdf")];
    const selected = selectChunks(chunks, ["instructor curriculum regulation requirements records"], 12, groups);
    expect(selected.length).toBeLessThanOrEqual(12);
    expect(selected.some((c) => c.includes("[dominant.pdf]"))).toBe(true);
    expect(selected.some((c) => c.includes("[vol2.pdf]"))).toBe(true);
  });

  it("behaves as before when no groups are provided", () => {
    const chunks = ["alpha instructor curriculum", "unrelated beta"];
    const selected = selectChunks(chunks, ["instructor curriculum"], 1);
    expect(selected).toEqual(["alpha instructor curriculum"]);
  });
});

describe("checklist AI review bounds", () => {
  it("hard-splits a long single-paragraph manual (no blank lines)", () => {
    // Simulates 25MB-style OCR output with no paragraph breaks (scaled down)
    const text = "word ".repeat(60_000).trim(); // ~300k chars, zero blank lines
    const chunks = chunkText(text, 1400);
    expect(chunks.length).toBeGreaterThan(100);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(1400);
    }
    // No content lost beyond whitespace trimming
    expect(chunks.join("").replace(/\s/g, "").length).toBe(text.replace(/\s/g, "").length);
  });

  it("caps total selected excerpt content even when chunks are oversized", () => {
    // Chunks produced by an unusual size arg, or pathological input, must
    // still respect the total ceiling once selected.
    const bigChunks = Array.from({ length: 12 }, (_, i) => `regulation instructor curriculum ${i} ` + "x".repeat(5000));
    const selected = selectChunks(bigChunks, ["instructor curriculum regulation requirements"]);
    const total = selected.reduce((s, c) => s + c.length, 0);
    expect(total).toBeLessThanOrEqual(18000);
    expect(selected.length).toBeGreaterThan(0);
  });

  it("batches a maximum-size single-area import into bounded review calls", () => {
    // Import allows up to 500 items, all in one area — one review call must
    // never carry more than the batch size.
    const items = Array.from({ length: 500 }, (_, i) => ({ id: `item-${i}` }));
    const batches = batchItems(items);
    expect(batches.length).toBe(20);
    for (const b of batches) expect(b.length).toBeLessThanOrEqual(25);
    // All items covered exactly once
    expect(batches.flat().map((i) => i.id)).toEqual(items.map((i) => i.id));
  });

  it("keeps paragraph-structured text within chunk bounds too", () => {
    const text = Array.from({ length: 50 }, (_, i) => `Paragraph ${i} about instructors and curricula. `.repeat(10)).join("\n\n");
    const chunks = chunkText(text, 1400);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1400 + 2);
  });
});
