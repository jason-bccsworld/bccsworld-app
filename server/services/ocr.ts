import { createWorker } from "tesseract.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
        if (data.text && data.text.trim().length > 0) {
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
    
    // If pdftotext fails or returns no text, convert PDF to images and OCR them
    console.log('Converting PDF to images for OCR...');
    
    // Create temporary directory for images
    const tempDir = path.join(path.dirname(pdfPath), 'temp_pdf_images');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    try {
      // Convert PDF to images using pdftoppm
      const baseFileName = path.basename(pdfPath, '.pdf');
      const imagePrefix = path.join(tempDir, `${baseFileName}_page`);
      
      await execAsync(`pdftoppm -png "${pdfPath}" "${imagePrefix}"`);
      
      // Find all generated image files
      const imageFiles = fs.readdirSync(tempDir)
        .filter(file => file.startsWith(`${baseFileName}_page`) && file.endsWith('.png'))
        .sort();
      
      if (imageFiles.length === 0) {
        throw new Error('No images were generated from PDF');
      }
      
      console.log(`Generated ${imageFiles.length} images from PDF`);
      
      // OCR each image and combine results
      let combinedText = '';
      
      for (const imageFile of imageFiles) {
        const imagePath = path.join(tempDir, imageFile);
        console.log(`Processing image: ${imageFile}`);
        
        try {
          const imageText = await processImageOCR(imagePath);
          combinedText += imageText + '\n\n';
        } catch (imageError) {
          const errorMessage = imageError instanceof Error ? imageError.message : 'Unknown error';
          console.log(`Failed to OCR image ${imageFile}:`, errorMessage);
        }
      }
      
      // Clean up temporary images
      for (const imageFile of imageFiles) {
        const imagePath = path.join(tempDir, imageFile);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
      
      // Remove temp directory if empty
      try {
        fs.rmdirSync(tempDir);
      } catch (e) {
        // Ignore if directory is not empty
      }
      
      if (combinedText.trim().length > 0) {
        console.log('Successfully extracted text from PDF images');
        return combinedText.trim();
      }
      
      throw new Error('No text could be extracted from PDF images');
      
    } catch (conversionError) {
      console.error('PDF to image conversion failed:', conversionError);
      const errorMessage = conversionError instanceof Error ? conversionError.message : 'Unknown error';
      throw new Error(`Failed to process PDF: ${errorMessage}${pdfParseFailure ? ` (text extraction fallback also failed: ${pdfParseFailure})` : ''}`);
    }
    
  } catch (error) {
    console.error('PDF processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to process PDF: ${errorMessage}`);
  }
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
  const worker = await createWorker('eng');

  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);

    return text;
  } finally {
    await worker.terminate();
  }
}
