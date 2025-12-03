import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer
} from "docx";

export async function generateDocumentImportTutorial(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "AI Document Import Tutorial",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: "BCCS-US Aviation Compliance Platform",
                italics: true,
                color: "666666"
              })
            ]
          }),

          new Paragraph({
            text: "Overview",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "The AI Document Import feature allows you to upload training documents that are automatically processed using advanced AI and OCR (Optical Character Recognition) technology. The system extracts relevant compliance data, validates it against regulatory requirements, and prepares it for blockchain verification."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "This powerful tool transforms paper-based and digital documents into structured, searchable, and verifiable compliance records - essential for modern aviation training organizations."
              })
            ]
          }),

          new Paragraph({
            text: "Supported Document Types",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The system accepts the following file formats:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "PDF Documents",
                bold: true
              }),
              new TextRun({
                text: " - Training certificates, syllabi, regulatory documents, audit reports"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Excel Spreadsheets (.xlsx)",
                bold: true
              }),
              new TextRun({
                text: " - Training records, student rosters, compliance tracking sheets"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "CSV Files",
                bold: true
              }),
              new TextRun({
                text: " - Exported data from other systems, bulk record imports"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Images (JPEG, PNG)",
                bold: true
              }),
              new TextRun({
                text: " - Scanned certificates, signed documents, photo evidence"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Maximum file size: 10MB per file",
                italics: true,
                color: "666666"
              })
            ]
          }),

          new Paragraph({
            text: "How to Upload Documents",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: "Step 1: Access the Upload Area",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Navigate to the \"AI Document Import\" page from the sidebar. You'll see the upload area prominently displayed with a cloud upload icon."
              })
            ]
          }),
          new Paragraph({
            text: "Step 2: Select Your Files",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "You have two options to add files:"
              })
            ]
          }),
          new Paragraph({
            text: "• Drag and Drop - Simply drag files from your computer and drop them onto the upload area",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Click to Browse - Click the \"Select Files\" button to open your file browser",
            bullet: { level: 0 },
            spacing: { after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "You can select multiple files at once for batch processing."
              })
            ]
          }),
          new Paragraph({
            text: "Step 3: Monitor Upload Progress",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Once you add files, you'll see:"
              })
            ]
          }),
          new Paragraph({
            text: "• A progress indicator for each file being uploaded",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Status updates (Pending → Uploading → Success/Error)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Success confirmation with a green checkmark",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Error messages if something goes wrong",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "Document Processing Pipeline",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "After upload, documents go through an automated processing pipeline:"
              })
            ]
          }),
          new Paragraph({
            text: "Stage 1: Upload Complete",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Status: ",
                bold: true
              }),
              new TextRun({
                text: "Uploaded",
                color: "B45309"
              }),
              new TextRun({
                text: " (amber indicator)"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The file has been received and stored securely. It's queued for AI processing."
              })
            ]
          }),
          new Paragraph({
            text: "Stage 2: AI Processing",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Status: ",
                bold: true
              }),
              new TextRun({
                text: "Processing",
                color: "2563EB"
              }),
              new TextRun({
                text: " (blue spinner)"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "During this stage, the system:"
              })
            ]
          }),
          new Paragraph({
            text: "• Applies OCR to extract text from images and scanned PDFs",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Uses AI to identify document type and structure",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Extracts key fields (dates, names, certificate numbers, etc.)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Maps extracted data to compliance requirements",
            bullet: { level: 0 },
            spacing: { after: 100 }
          }),
          new Paragraph({
            text: "Stage 3: Processing Complete",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Status: ",
                bold: true
              }),
              new TextRun({
                text: "Processed",
                color: "059669"
              }),
              new TextRun({
                text: " (green checkmark)"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "AI processing is complete. Extracted data is ready for human review and validation."
              })
            ]
          }),
          new Paragraph({
            text: "Stage 4: Validation",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Status: ",
                bold: true
              }),
              new TextRun({
                text: "Validated",
                color: "047857"
              }),
              new TextRun({
                text: " (dark green checkmark)"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "A human reviewer has verified the extracted data. The document is ready for blockchain hashing and permanent record creation."
              })
            ]
          }),

          new Paragraph({
            text: "Document Processing History",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The bottom section of the page shows all your uploaded documents with:"
              })
            ]
          }),
          new Paragraph({
            text: "• File name and upload timestamp",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Current processing status with color-coded badge",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• View button - Preview document details and extracted data",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Download button - Download the original file",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "Processing Guidelines",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "For best results, follow these recommendations:"
              })
            ]
          }),
          new Paragraph({
            text: "High-Quality Scans",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Use 300+ DPI (dots per inch) when scanning documents. Higher resolution means better OCR accuracy. Most modern scanners default to 300 DPI, but check your settings for important documents."
              })
            ]
          }),
          new Paragraph({
            text: "Clear, Legible Text",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Ensure text is sharp and not blurred. Avoid scanning documents through plastic sleeves or at extreme angles. If text is faded, consider adjusting scan contrast settings."
              })
            ]
          }),
          new Paragraph({
            text: "Standard Orientation",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Upload documents right-side up. While the AI can handle some rotation, properly oriented documents process faster and more accurately."
              })
            ]
          }),
          new Paragraph({
            text: "Complete Documents",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Include all pages of multi-page documents in a single PDF rather than separate image files. This helps the AI understand context across pages."
              })
            ]
          }),

          new Paragraph({
            text: "Common Document Types",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The AI is trained to recognize and extract data from various aviation training documents:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Training Certificates",
                bold: true
              }),
              new TextRun({
                text: " - Student name, certificate number, date issued, type ratings"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Course Completion Records",
                bold: true
              }),
              new TextRun({
                text: " - Course name, hours completed, instructor signatures"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Flight Training Records",
                bold: true
              }),
              new TextRun({
                text: " - Flight hours, maneuvers, aircraft type, dual/solo time"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Simulator Session Logs",
                bold: true
              }),
              new TextRun({
                text: " - Device ID, session duration, scenarios practiced"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Knowledge Test Results",
                bold: true
              }),
              new TextRun({
                text: " - Test type, score, date, testing center"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Practical Test Results",
                bold: true
              }),
              new TextRun({
                text: " - Examiner name, areas of operation, outcome"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Instructor Records",
                bold: true
              }),
              new TextRun({
                text: " - Instructor certificates, currency dates, ratings held"
              })
            ]
          }),

          new Paragraph({
            text: "Error Handling",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "If a document shows an ",
                bold: false
              }),
              new TextRun({
                text: "Error",
                color: "DC2626",
                bold: true
              }),
              new TextRun({
                text: " status, common causes include:"
              })
            ]
          }),
          new Paragraph({
            text: "• File too large (exceeds 10MB limit)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Unsupported file format",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Corrupted or password-protected file",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Image quality too low for OCR",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Document in unsupported language",
            bullet: { level: 0 },
            spacing: { after: 100 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Solution: ",
                bold: true
              }),
              new TextRun({
                text: "Check the file meets requirements and try re-uploading. For persistent issues, contact support with the file name and error details."
              })
            ]
          }),

          new Paragraph({
            text: "Integration with Compliance System",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Documents processed through AI Document Import integrate with other BCCS-US features:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Adaptive Compliance",
                bold: true
              }),
              new TextRun({
                text: " - Extracted data maps to checklist items for evidence indexing"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Blockchain Verification",
                bold: true
              }),
              new TextRun({
                text: " - Validated documents are hashed and recorded on the blockchain"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Audit Packets",
                bold: true
              }),
              new TextRun({
                text: " - Processed documents can be included in generated audit packets"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Training Records",
                bold: true
              }),
              new TextRun({
                text: " - Extracted training events populate the training record system"
              })
            ]
          }),

          new Paragraph({
            text: "Tips for Success",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "1. Batch similar documents",
                bold: true
              }),
              new TextRun({
                text: " - Upload training certificates together, then flight records, etc."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "2. Use descriptive file names",
                bold: true
              }),
              new TextRun({
                text: " - \"Smith_John_ATP_Certificate_2024.pdf\" is better than \"scan001.pdf\""
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "3. Review processed documents promptly",
                bold: true
              }),
              new TextRun({
                text: " - Validate extracted data while document details are fresh"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "4. Maintain original copies",
                bold: true
              }),
              new TextRun({
                text: " - Keep physical originals even after digital processing"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "5. Check processing history regularly",
                bold: true
              }),
              new TextRun({
                text: " - Monitor for any documents stuck in processing or showing errors"
              })
            ]
          }),

          new Paragraph({
            spacing: { before: 600 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "© BCCS-US Aviation Compliance Platform",
                italics: true,
                color: "999999",
                size: 20
              })
            ]
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
