import { createWorker } from "tesseract.js";
import fs from "fs";
import path from "path";

export async function processDocumentOCR(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();

    // For PDFs, we'd need to convert to images first
    // For now, handle images directly
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      return await processImageOCR(filePath);
    } else if (ext === ".pdf") {
      // For PDFs, we'd need pdf-poppler or similar to convert to images
      // For now, return placeholder
      return "PDF OCR processing not implemented yet";
    } else {
      throw new Error("Unsupported file type for OCR");
    }
  } catch (error) {
    console.error("OCR processing error:", error);
    throw error;
  }
}

async function processImageOCR(imagePath: string): Promise<string> {
  const worker = await createWorker();

  try {
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    const {
      data: { text },
    } = await worker.recognize(imagePath);

    return text;
  } finally {
    await worker.terminate();
  }
}
