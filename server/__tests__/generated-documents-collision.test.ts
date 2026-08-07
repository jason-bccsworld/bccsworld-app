/**
 * Regression test: repeated generation of the same document type must not
 * overwrite the previously persisted file. Generated logical filenames are
 * deterministic per document type, so the persistence layer prefixes stored
 * files with a UUID — every generation gets a distinct filePath and its DB
 * row keeps pointing at its own content.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

const h = vi.hoisted(() => ({
  createdRows: [] as any[],
  generation: 0,
}));

// Canned OpenAI so no network call is made; content differs per generation.
vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: async () => ({
          choices: [
            { message: { content: `generated content #${++h.generation}` } },
          ],
        }),
      },
    };
  },
}));

vi.mock("../storage", () => ({
  storage: {
    createGeneratedDocument: vi.fn(async (row: any) => {
      const saved = { id: `row-${h.createdRows.length + 1}`, ...row };
      h.createdRows.push(saved);
      return saved;
    }),
  },
}));

import { documentGenerator } from "../services/document-generator";

describe("generated document persistence collision safety", () => {
  beforeEach(() => {
    h.createdRows.length = 0;
  });

  afterAll(() => {
    for (const row of h.createdRows) {
      try {
        fs.unlinkSync(row.filePath);
      } catch {
        /* already removed */
      }
    }
  });

  it("generating the same document type twice keeps distinct rows, paths, and content", async () => {
    const args = [
      "user-1",
      "org-1",
      ["TRAINING_RECORD_TEMPLATE"],
      { organizationName: "Acme Aviation" },
    ] as const;

    await documentGenerator.autoGenerateComplianceDocuments(...args);
    await documentGenerator.autoGenerateComplianceDocuments(...args);

    expect(h.createdRows).toHaveLength(2);
    const [first, second] = h.createdRows;

    // Same logical filename (deterministic per type)...
    expect(first.filename).toBe(second.filename);
    // ...but distinct persisted paths.
    expect(first.filePath).not.toBe(second.filePath);
    expect(path.basename(first.filePath)).not.toBe(path.basename(second.filePath));

    // Each row's file still contains that generation's own content.
    expect(fs.readFileSync(first.filePath, "utf8")).toBe("generated content #1");
    expect(fs.readFileSync(second.filePath, "utf8")).toBe("generated content #2");
  });
});
