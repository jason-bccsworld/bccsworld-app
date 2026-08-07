import { describe, it, expect } from "vitest";
import { chunkText, selectChunks, batchItems } from "../services/checklist-review-utils";

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
