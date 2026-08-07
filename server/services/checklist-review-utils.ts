/**
 * Pure helpers for the Part 142 Checklist Report AI review — kept free of DB
 * and route imports so they can be unit-tested directly.
 */
export function chunkText(text: string, size = 1400): string[] {
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

/** Total prompt-content ceiling for selected manual excerpts (chars). */
const MAX_EXCERPT_CHARS = 18000;

/** Pick the manual chunks most relevant to a set of checklist items. */
export function selectChunks(chunks: string[], itemTexts: string[], maxChunks = 12): string[] {
  const itemKw = keywords(itemTexts.join(" "));
  const scored = chunks.map((chunk, i) => {
    const ck = keywords(chunk);
    let score = 0;
    for (const w of ck) if (itemKw.has(w)) score++;
    return { i, chunk, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, maxChunks).sort((a, b) => a.i - b.i).map((s) => s.chunk);
  // Enforce a hard ceiling on total prompt content regardless of chunk sizes.
  const bounded: string[] = [];
  let total = 0;
  for (const chunk of picked) {
    const remaining = MAX_EXCERPT_CHARS - total;
    if (remaining <= 0) break;
    const piece = chunk.length > remaining ? chunk.slice(0, remaining) : chunk;
    bounded.push(piece);
    total += piece.length;
  }
  return bounded;
}
