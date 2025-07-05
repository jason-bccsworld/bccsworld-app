import { createWorker } from "tesseract.js";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function processPdfText(pdfPath: string): Promise<string> {
  try {
    // Use pdftotext command to extract text directly from PDF
    
    console.log(`Extracting text from PDF: ${pdfPath}`);
    
    // Extract text using pdftotext
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
    
    if (stdout && stdout.trim().length > 0) {
      console.log('Successfully extracted text from PDF');
      return stdout.trim();
    }
    
    // If no text extracted, it might be a scanned PDF - use Tesseract on the PDF directly
    console.log('No text found, trying OCR on PDF pages...');
    
    // Fallback: Use Tesseract to OCR the PDF directly (limited but might work)
    const worker = await createWorker('eng');
    
    try {
      const { data: { text } } = await worker.recognize(pdfPath);
      await worker.terminate();
      
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (ocrError) {
      await worker.terminate();
      console.log('Direct OCR failed, this appears to be a complex PDF');
    }
    
    throw new Error('Unable to extract text from this PDF format');
    
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error(`Failed to process PDF: ${error.message}`);
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
