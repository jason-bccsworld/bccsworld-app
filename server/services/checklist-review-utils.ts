/**
 * Pure helpers for the Part 142 Checklist Report AI review — kept free of DB
 * and route imports so they can be unit-tested directly.
 */
export function chunkText(text: string, size = CHUNK_SIZE): string[] {
  // Split on paragraph boundaries, but hard-split any run that exceeds the
  // chunk size even without a blank line (e.g. single-paragraph OCR output).
  const paragraphs = text.split(/\n\s*\n/).flatMap((p) => {
    if (p.length <= size) return [p];
    const pieces: string[] = [];
    for (let i = 0; i < p.length; i += size) pieces.push(p.slice(i, i + size));
    return pieces;
  });
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > size && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

const STOPWORDS = new Set(["the","a","an","and","or","of","to","in","for","is","are","does","do","with","that","this","any","all","each","has","have","been","be","by","on","at","its","their","center","training"]);

function keywords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
  );
}

/** Split an area's items into bounded batches — one OpenAI call each. */
export function batchItems<T>(items: T[], batchSize = 25): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) batches.push(items.slice(i, i + batchSize));
  return batches;
}

/** Default manual chunk size in characters (chunkText). */
export const CHUNK_SIZE = 1400;

/** Ceiling on total *source text* (excluding labels) selected per prompt. */
export const MAX_EXCERPT_CHARS = 18000;

/** How much of the combined manual text a single review prompt can consult.
 *
 * `totalChars` is the combined raw extracted text of all manual documents
 * (the same basis as the stored text_chars totals), and the capacity is the
 * same raw-source-text ceiling `selectExcerpts` enforces — labels/filenames
 * are excluded from both sides. Returns the fraction (0..1] that fits,
 * plus a `limited` flag set whenever the combined text exceeds the capacity
 * — i.e. some manual text cannot be consulted in any single review prompt. */
export function promptCoverage(totalChars: number): { ratio: number; limited: boolean; maxExcerptChars: number } {
  const ratio = totalChars > 0 ? Math.min(1, MAX_EXCERPT_CHARS / totalChars) : 1;
  return { ratio, limited: totalChars > MAX_EXCERPT_CHARS, maxExcerptChars: MAX_EXCERPT_CHARS };
}

export interface ExcerptEntry {
  /** Raw chunk text (no labels — the source-text budget applies to this). */
  text: string;
  /** Source label, e.g. the originating document's filename. */
  source: string;
}

/** Pick the manual chunks most relevant to a set of checklist items and
 * report exactly how much raw source text was selected.
 *
 * The `maxSourceChars` ceiling applies to raw chunk text only; source labels
 * are returned separately so filename length never eats into the budget.
 * Every distinct source is guaranteed at least one selected chunk (its
 * best-scoring one), so no document is silently excluded from the prompt.
 *
 * There is deliberately no default chunk-count cap: the source-char ceiling
 * is the only binding limit, so any manual set at or below the ceiling is
 * fully selectable — keeping this in lockstep with `promptCoverage`, which
 * treats text within the ceiling as fully consultable. */
export function selectExcerpts(
  entries: ExcerptEntry[],
  itemTexts: string[],
  maxChunks = Number.POSITIVE_INFINITY,
  maxSourceChars = MAX_EXCERPT_CHARS,
): { excerpts: ExcerptEntry[]; selectedSourceChars: number; totalSourceChars: number } {
  const itemKw = keywords(itemTexts.join(" "));
  const scored = entries.map((e, i) => {
    const ck = keywords(e.text);
    let score = 0;
    for (const w of ck) if (itemKw.has(w)) score++;
    return { i, entry: e, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const pickedIdx = new Set<number>();
  // Reserve one slot per source (best-scoring chunk of each).
  for (const src of new Set(entries.map((e) => e.source))) {
    if (pickedIdx.size >= maxChunks) break;
    const best = scored.find((s) => s.entry.source === src);
    if (best) pickedIdx.add(best.i);
  }
  for (const s of scored) {
    if (pickedIdx.size >= maxChunks) break;
    pickedIdx.add(s.i);
  }
  const picked = scored.filter((s) => pickedIdx.has(s.i)).sort((a, b) => a.i - b.i);
  // Enforce a hard ceiling on total raw source text regardless of chunk sizes.
  const excerpts: ExcerptEntry[] = [];
  let selectedSourceChars = 0;
  for (const { entry } of picked) {
    const remaining = maxSourceChars - selectedSourceChars;
    if (remaining <= 0) break;
    const text = entry.text.length > remaining ? entry.text.slice(0, remaining) : entry.text;
    excerpts.push({ text, source: entry.source });
    selectedSourceChars += text.length;
  }
  const totalSourceChars = entries.reduce((s, e) => s + e.text.length, 0);
  return { excerpts, selectedSourceChars, totalSourceChars };
}

/** Pick the manual chunks most relevant to a set of checklist items.
 *
 * When `groups` is provided (one label per chunk, e.g. the source document's
 * filename), every distinct group is guaranteed at least one selected chunk —
 * its best-scoring one — so no document is silently excluded from the prompt.
 * Remaining slots are filled by global relevance score. */
export function selectChunks(chunks: string[], itemTexts: string[], maxChunks = Number.POSITIVE_INFINITY, groups?: string[]): string[] {
  const useGroups = !!groups && groups.length === chunks.length;
  const entries = chunks.map((text, i) => ({ text, source: useGroups ? groups![i] : "" }));
  return selectExcerpts(entries, itemTexts, maxChunks).excerpts.map((e) => e.text);
}
