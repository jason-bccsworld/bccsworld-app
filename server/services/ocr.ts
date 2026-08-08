import { createWorker } from "tesseract.js";
import fs from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Max pages rasterized+OCR'd for scanned PDFs (serverless functions have a 30s cap). */
const MAX_OCR_PAGES = 10;
/** Stop OCR-ing additional pages once this much wall time has elapsed (ms). */
const OCR_TIME_BUDGET_MS = 20_000;

const SCANNED_PDF_HELP =
  "This PDF appears to be scanned (image-only) and no readable text could be recovered from it. " +
  "Please upload a text-based PDF (e.g. exported from Word) or a Word (.docx) version of the document.";

/**
 * pdfjs (used by pdf-parse) expects a few browser globals that do not exist in
 * bare Node/serverless runtimes. Text extraction only needs lightweight 2D
 * matrix math, so a minimal DOMMatrix (plus inert ImageData/Path2D stubs) is
 * sufficient — without these the import fails with "DOMMatrix is not defined".
 */
function ensurePdfJsGlobals() {
  const g = globalThis as any;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(init?: number[] | string) {
        if (Array.isArray(init) && init.length >= 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }
      multiply(o: any) {
        const m = new (g.DOMMatrix)();
        m.a = this.a * o.a + this.c * o.b;
        m.b = this.b * o.a + this.d * o.b;
        m.c = this.a * o.c + this.c * o.d;
        m.d = this.b * o.c + this.d * o.d;
        m.e = this.a * o.e + this.c * o.f + this.e;
        m.f = this.b * o.e + this.d * o.f + this.f;
        return m;
      }
      translate(tx = 0, ty = 0) { const o = new (g.DOMMatrix)([1, 0, 0, 1, tx, ty]); return this.multiply(o); }
      scale(sx = 1, sy = sx) { const o = new (g.DOMMatrix)([sx, 0, 0, sy, 0, 0]); return this.multiply(o); }
      transformPoint(p: any = { x: 0, y: 0 }) {
        return { x: this.a * p.x + this.c * p.y + this.e, y: this.b * p.x + this.d * p.y + this.f };
      }
      toString() { return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`; }
    };
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      width: number; height: number; data: Uint8ClampedArray;
      constructor(w: number, h: number) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); }
    };
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D { addPath() {} moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} closePath() {} rect() {} arc() {} };
  }
}

async function processPdfText(pdfPath: string): Promise<string> {
  try {
    console.log(`Extracting text from PDF: ${pdfPath}`);
    
    // First, try to extract text using pdftotext
    try {
      const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
      
      if (stdout && stdout.trim().length > 0) {
        console.log('Successfully extracted text from PDF');
        return stdout.trim();
      }
    } catch (pdfTextError) {
      console.log('pdftotext failed or unavailable, trying pure-JS extraction');
    }

    // Pure-JS fallback (works on serverless hosts without poppler): pdf-parse
    let pdfParseFailure: string | null = null;
    try {
      ensurePdfJsGlobals();
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(pdfPath)) });
      try {
        const data = await parser.getText();
        // pdf-parse emits "-- N of M --" page separators even for image-only
        // pages; strip them before judging whether real text was extracted,
        // otherwise scanned PDFs look like they have text and never reach OCR.
        const meaningful = (data.text || '')
          .replace(/^\s*--\s*\d+\s*of\s*\d+\s*--\s*$/gm, '')
          .trim();
        if (meaningful.length > 50) {
          console.log('Successfully extracted text from PDF via pdf-parse');
          return data.text.trim();
        }
      } finally {
        await parser.destroy();
      }
    } catch (pdfParseError) {
      pdfParseFailure = pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError);
      console.log('pdf-parse extraction failed, PDF might be scanned:', pdfParseFailure);
    }
    
    // No embedded text found — the PDF is likely scanned (image-only).
    // Rasterize pages in-process (pure JS + @napi-rs/canvas; no poppler
    // binaries, which do not exist on serverless hosts) and OCR them.
    console.log('No embedded text found; rasterizing PDF pages for OCR...');
    try {
      const text = await ocrScannedPdf(pdfPath);
      if (text.trim().length > 0) {
        console.log('Successfully extracted text from scanned PDF via OCR');
        return text.trim();
      }
      throw new Error(SCANNED_PDF_HELP);
    } catch (ocrError) {
      const msg = ocrError instanceof Error ? ocrError.message : String(ocrError);
      console.error('Scanned-PDF OCR failed:', msg, pdfParseFailure ? `(pdf-parse: ${pdfParseFailure})` : '');
      // Surface a clear, user-facing message rather than internal tool errors.
      throw new Error(msg === SCANNED_PDF_HELP ? msg : SCANNED_PDF_HELP);
    }

  } catch (error) {
    console.error('PDF processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(errorMessage === SCANNED_PDF_HELP ? errorMessage : `Failed to process PDF: ${errorMessage}`);
  }
}

/**
 * Rasterize up to MAX_OCR_PAGES pages of a PDF entirely in-process
 * (pdf-parse getScreenshot → pdfjs + @napi-rs/canvas) and OCR each page
 * with tesseract.js. Works on serverless hosts with no external binaries.
 */
async function ocrScannedPdf(pdfPath: string): Promise<string> {
  ensurePdfJsGlobals();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(pdfPath)) });

  let pages: { pageNumber: number; data: Uint8Array }[] = [];
  let totalPages = 0;
  try {
    const shots = await parser.getScreenshot({ first: MAX_OCR_PAGES, scale: 2 });
    totalPages = shots.total;
    pages = shots.pages;
  } finally {
    await parser.destroy();
  }
  if (pages.length === 0) {
    throw new Error(SCANNED_PDF_HELP);
  }
  console.log(`Rasterized ${pages.length} of ${totalPages} PDF page(s) for OCR`);

  // Reuse one tesseract worker for all pages; cache language data in tmp
  // (the working directory is read-only on serverless hosts).
  const worker = await createWorker('eng', undefined, { cachePath: os.tmpdir() });
  const started = Date.now();
  let combinedText = '';
  let processed = 0;
  try {
    for (const page of pages) {
      if (processed > 0 && Date.now() - started > OCR_TIME_BUDGET_MS) {
        console.log(`OCR time budget reached after ${processed} page(s); stopping`);
        break;
      }
      try {
        const { data: { text } } = await worker.recognize(Buffer.from(page.data));
        combinedText += text + '\n\n';
      } catch (pageError) {
        console.log(`Failed to OCR page ${page.pageNumber}:`, pageError instanceof Error ? pageError.message : pageError);
      }
      processed++;
    }
  } finally {
    await worker.terminate();
  }
  return combinedText;
}

export async function processDocumentOCR(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    console.log("Processing file with extension:", ext, "for file:", filePath);

    // For PDFs, we'd need to convert to images first
    // For now, handle images directly
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      return await processImageOCR(filePath);
    } else if (ext === ".pdf") {
      // For PDF files, we'll use a placeholder approach for now
      // In production, this would use a PDF-to-text extraction library
      return await processPdfText(filePath);
    } else {
      console.error("Unsupported file extension:", ext);
      throw new Error(`Unsupported file type for OCR: ${ext}`);
    }
  } catch (error) {
    console.error("OCR processing error:", error);
    throw error;
  }
}

async function processImageOCR(imagePath: string): Promise<string> {
  // cachePath: the working directory is read-only on serverless hosts
  const worker = await createWorker('eng', undefined, { cachePath: os.tmpdir() });

  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);

    return text;
  } finally {
    await worker.terminate();
  }
}
