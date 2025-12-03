import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer
} from "docx";

export async function generateAdaptiveComplianceTutorial(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Adaptive Compliance Tutorial",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          new Paragraph({
            text: "BCCS142 Aviation Compliance Platform",
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
            children: [
              new TextRun({
                text: "BCCS142 Aviation Compliance Platform",
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
                text: "The Adaptive Compliance page is your central hub for managing regulatory compliance across your aviation training organization. It uses a \"regulatory spine\" architecture where 14 CFR Part 142 serves as the foundation, with other regulations attaching dynamically based on your authorizations."
              })
            ]
          }),

          new Paragraph({
            text: "Getting Started",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: "Step 1: Initialize the Regulatory Spine",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "When you first visit the page, click the "
              }),
              new TextRun({
                text: "\"Initialize Regulatory Spine\"",
                bold: true
              }),
              new TextRun({
                text: " button in the top right corner. This sets up:"
              })
            ]
          }),
          new Paragraph({
            text: "• The primary spine (14 CFR Part 142)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Core attachments (FAA Order 8900.1 Volumes 3 & 6)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Dynamic attachments (14 CFR Parts 61, 91, 121, 135)",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "The Five Tabs",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),

          new Paragraph({
            text: "1. Regulatory Spine Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "This tab shows your regulatory framework hierarchy:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Primary Regulatory Spine",
                bold: true
              }),
              new TextRun({
                text: " - Displays your core regulation (14 CFR Part 142) with its version and status"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Dynamic Attachments",
                bold: true
              }),
              new TextRun({
                text: " - Lists all regulations that attach to the spine based on your training authorizations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Hierarchy Visualization",
                bold: true
              }),
              new TextRun({
                text: " - A visual diagram showing how regulations relate to each other"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "When to use: ",
                bold: true,
                italics: true
              }),
              new TextRun({
                text: "Review this tab to understand which regulations apply to your organization and ensure all relevant frameworks are active."
              })
            ]
          }),

          new Paragraph({
            text: "2. Checklists Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "This is where you manage compliance checklists from various sources."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "To Import a Checklist:",
                bold: true
              })
            ]
          }),
          new Paragraph({
            text: "1. Click \"Import Checklist\" button",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "2. Enter a name (e.g., \"FAA Part 142 Training Audit\")",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "3. Set the version number",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "4. Select the source (FAA, TCPM, Regional FSDO, Operator, or Industry)",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "5. Optionally link to a regulatory framework",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "6. Enter checklist items in this format:",
            spacing: { after: 50 }
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: "ItemCode | Description | Regulatory Reference | Category",
                font: "Courier New",
                size: 20
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: "Example: 142.53(a) | Training syllabus approved | 14 CFR 142.53 | Training",
                font: "Courier New",
                size: 20
              })
            ]
          }),
          new Paragraph({
            text: "7. Check \"canonical\" if this is the authoritative version",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "8. Click \"Import Checklist\"",
            spacing: { after: 100 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Delta Reporting: ",
                bold: true
              }),
              new TextRun({
                text: "Shows differences between checklists - added, removed, modified, and reordered items."
              })
            ]
          }),

          new Paragraph({
            text: "3. Inspectors Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Track FAA inspector preferences and behavior patterns:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Inspector Profiles",
                bold: true
              }),
              new TextRun({
                text: " - View tracked inspectors with their region and office, number of audits tracked, strictness score (Lenient, Moderate, or Strict), prediction confidence percentage, and focus areas they commonly examine."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Prediction Accuracy",
                bold: true
              }),
              new TextRun({
                text: " - Shows how well the system predicts checklist ordering preferences, additional questions they might ask, and areas they focus on during audits."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "When to use: ",
                bold: true,
                italics: true
              }),
              new TextRun({
                text: "Before an audit, review the assigned inspector's profile to prepare for their likely focus areas."
              })
            ]
          }),

          new Paragraph({
            text: "4. Evidence Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Manage compliance evidence linked to checklist items:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Evidence Stats",
                bold: true
              }),
              new TextRun({
                text: " - See counts for total evidence indexed, blockchain-verified evidence, and evidence pending verification."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Evidence-On-Demand API",
                bold: true
              }),
              new TextRun({
                text: " - Technical reference for retrieving evidence programmatically by checklist item or regulatory reference."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "When to use: ",
                bold: true,
                italics: true
              }),
              new TextRun({
                text: "Index training records, documents, and other evidence to demonstrate compliance for each checklist item."
              })
            ]
          }),

          new Paragraph({
            text: "5. Audit Packets Tab",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Generate ready-to-present audit documentation."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Two Packet Types:",
                bold: true
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "1. Regulation-Sorted Packet",
                bold: true
              }),
              new TextRun({
                text: " - Organizes evidence by regulatory reference (best for regulatory-focused audits)"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "2. Checklist-Sorted Packet",
                bold: true
              }),
              new TextRun({
                text: " - Organizes evidence by checklist item order (best for inspector-led audits)"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Packet Integrity: ",
                bold: true
              }),
              new TextRun({
                text: "All packets are cryptographically hashed with evidence verified against blockchain training records."
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "When to use: ",
                bold: true,
                italics: true
              }),
              new TextRun({
                text: "Before an audit, generate the appropriate packet type to present your compliance evidence in the format your inspector prefers."
              })
            ]
          }),

          new Paragraph({
            text: "Dashboard Metrics",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "At the top, four cards show your compliance overview:"
              })
            ]
          }),
          new Paragraph({
            text: "• Active Frameworks - Number of regulatory frameworks configured",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Harmonized Checklists - Number of imported checklists",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Tracked Inspectors - Number of inspector profiles",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "• Compliance Score - Overall compliance percentage",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "Best Practices",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "1. Start with the spine",
                bold: true
              }),
              new TextRun({
                text: " - Always initialize the regulatory spine first"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "2. Import canonical checklists",
                bold: true
              }),
              new TextRun({
                text: " - Use official FAA checklists as your baseline"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "3. Track your inspectors",
                bold: true
              }),
              new TextRun({
                text: " - Build profiles over time for better predictions"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "4. Link evidence early",
                bold: true
              }),
              new TextRun({
                text: " - Index evidence as training events occur, not before audits"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "5. Generate packets regularly",
                bold: true
              }),
              new TextRun({
                text: " - Keep audit packets current for surprise inspections"
              })
            ]
          }),

          new Paragraph({
            spacing: { before: 600 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "© BCCS142 Aviation Compliance Platform",
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
