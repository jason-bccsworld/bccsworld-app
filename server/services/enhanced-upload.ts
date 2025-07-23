import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Enhanced file upload with better validation and processing
export const enhancedUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads/';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and original extension
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = Date.now();
      const uniqueName = `${baseName}_${timestamp}${ext}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (increased from 10MB)
    files: 10 // Allow up to 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp'
    ];
    
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.jpg', '.jpeg', '.png', '.tiff', '.bmp'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
    }
  }
});

// Batch upload processor
export interface UploadResult {
  success: boolean;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  processedAt: string;
  error?: string;
}

export class BatchUploadProcessor {
  async processUploadedFiles(files: Express.Multer.File[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      try {
        const result: UploadResult = {
          success: true,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          type: file.mimetype,
          processedAt: new Date().toISOString()
        };
        
        // Validate file integrity
        if (!fs.existsSync(file.path)) {
          throw new Error('File not found after upload');
        }
        
        // Check file size
        const stats = fs.statSync(file.path);
        if (stats.size !== file.size) {
          throw new Error('File size mismatch');
        }
        
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          filename: file.filename || 'unknown',
          originalName: file.originalname || 'unknown',
          size: file.size || 0,
          type: file.mimetype || 'unknown',
          processedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }
  
  async validateFileTypes(files: Express.Multer.File[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (const file of files) {
      // Check if file is a known compliance document type
      const filename = file.originalname.toLowerCase();
      
      if (filename.includes('certificate') && !filename.includes('.pdf')) {
        errors.push(`${file.originalname}: Certificates should typically be PDF format`);
      }
      
      if (filename.includes('manual') && !['pdf', 'docx', 'doc'].some(ext => filename.includes(ext))) {
        errors.push(`${file.originalname}: Manuals should be PDF or Word documents`);
      }
      
      if (file.size < 1024) {
        errors.push(`${file.originalname}: File appears to be too small (${file.size} bytes)`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const batchUploadProcessor = new BatchUploadProcessor();