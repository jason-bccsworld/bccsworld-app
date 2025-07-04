import { createWorker } from "tesseract.js";
import fs from "fs";
import path from "path";

async function processPdfText(pdfPath: string): Promise<string> {
  // For demonstration purposes, we'll simulate extracting text from an FAA license PDF
  // In production, this would use a proper PDF text extraction library
  
  const fileName = path.basename(pdfPath).toLowerCase();
  
  // Simulate extracting typical FAA license information
  const mockFaaLicenseText = `
    FEDERAL AVIATION ADMINISTRATION
    PILOT CERTIFICATE
    
    Certificate Number: P123456789
    Name: FREDERICK SMITH
    Address: 123 AVIATION WAY, PILOT CITY, ST 12345
    
    RATINGS AND LIMITATIONS:
    Private Pilot
    Airplane Single Engine Land
    
    DATE OF ISSUE: 01/15/2020
    CERTIFICATE TYPE: PRIVATE PILOT
    
    This certificate is issued under the authority of the Federal Aviation Administration.
    The holder of this certificate is authorized to exercise the privileges of the rating(s) shown.
  `.trim();
  
  return mockFaaLicenseText;
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
