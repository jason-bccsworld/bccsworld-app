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
            text: "Universal Adaptive Compliance Tutorial",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "PATENT PENDING",
                bold: true,
                color: "B91C1C",
                size: 24
              })
            ]
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
            text: "Introduction",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Welcome to the BCCS-US Universal Adaptive Compliance System. This patent-pending platform revolutionizes aviation regulatory compliance by providing a flexible, intelligent framework that adapts to ANY Federal Aviation Regulation (FAR) Part or Subpart. Whether you operate under Part 121, 135, 141, 142, 145, or any combination thereof, this system dynamically configures itself to your specific regulatory requirements."
              })
            ]
          }),

          new Paragraph({
            text: "What Makes This System Universal",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Unlike traditional compliance systems locked to a single regulation, BCCS-US supports:"
              })
            ]
          }),
          new Paragraph({
            text: "18 FAR Parts - From Part 21 (Certification) to Part 147 (AMT Schools)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "16 FAA Order 8900.1 Volumes - Complete inspector guidance coverage",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "All Policy Document Types - SAFOs, InFOs, Advisory Circulars, Legal Interpretations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Multi-Part Compliance - Simultaneous adherence to multiple regulatory frameworks",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Blockchain Verification - Immutable audit trails for all compliance evidence",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "Supported FAR Parts",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Part", children: [new TextRun({ text: "Part", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Name", children: [new TextRun({ text: "Name", bold: true })] })],
                    width: { size: 55, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Subchapter", children: [new TextRun({ text: "Subchapter", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Can Be Spine", children: [new TextRun({ text: "Can Be Spine", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 21")] }),
                  new TableCell({ children: [new Paragraph("Certification Procedures for Products and Articles")] }),
                  new TableCell({ children: [new Paragraph("C")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 43")] }),
                  new TableCell({ children: [new Paragraph("Maintenance, Preventive Maintenance, Rebuilding")] }),
                  new TableCell({ children: [new Paragraph("C")] }),
                  new TableCell({ children: [new Paragraph("No")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 61")] }),
                  new TableCell({ children: [new Paragraph("Pilot, Flight Instructor, and Ground Instructor Certification")] }),
                  new TableCell({ children: [new Paragraph("D")] }),
                  new TableCell({ children: [new Paragraph("No")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 91")] }),
                  new TableCell({ children: [new Paragraph("General Operating and Flight Rules")] }),
                  new TableCell({ children: [new Paragraph("F")] }),
                  new TableCell({ children: [new Paragraph("No")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 119")] }),
                  new TableCell({ children: [new Paragraph("Certification: Air Carriers and Commercial Operators")] }),
                  new TableCell({ children: [new Paragraph("G")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 121")] }),
                  new TableCell({ children: [new Paragraph("Operating Requirements: Domestic, Flag, Supplemental")] }),
                  new TableCell({ children: [new Paragraph("G")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 135")] }),
                  new TableCell({ children: [new Paragraph("Commuter and On-Demand Operations")] }),
                  new TableCell({ children: [new Paragraph("G")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 141")] }),
                  new TableCell({ children: [new Paragraph("Pilot Schools")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 142")] }),
                  new TableCell({ children: [new Paragraph("Training Centers")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 145")] }),
                  new TableCell({ children: [new Paragraph("Repair Stations")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Part 147")] }),
                  new TableCell({ children: [new Paragraph("Aviation Maintenance Technician Schools")] }),
                  new TableCell({ children: [new Paragraph("H")] }),
                  new TableCell({ children: [new Paragraph("Yes")] })
                ]
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Additional parts supported: Part 63, 65, 91K, 107, 125, 129, 137",
                italics: true,
                color: "666666"
              })
            ]
          }),

          new Paragraph({
            text: "Getting Started",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),

          new Paragraph({
            text: "Step 1: Select Your Primary Regulatory Spine",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "The regulatory spine is your organization's primary regulatory framework. Everything else attaches to this spine. Use the "
              }),
              new TextRun({
                text: "Universal FAR Part Selector",
                bold: true
              }),
              new TextRun({
                text: " to choose your primary regulation:"
              })
            ]
          }),
          new Paragraph({
            text: "1. Click the FAR Part dropdown in the Universal FAR Part Selector section",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "2. Search or browse the available 18 FAR Parts",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "3. Select the part that best represents your primary operation",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "4. Click \"Select as Spine\" to establish your regulatory foundation",
            spacing: { after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Example: ",
                bold: true,
                italics: true
              }),
              new TextRun({
                text: "A Part 142 Training Center would select 14 CFR Part 142 as their spine, while an airline would select Part 121."
              })
            ]
          }),

          new Paragraph({
            text: "Step 2: Initialize All FAR Parts (Optional)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "For organizations requiring comprehensive regulatory coverage, click the "
              }),
              new TextRun({
                text: "\"Initialize All FAR Parts\"",
                bold: true
              }),
              new TextRun({
                text: " button to load all 18 FAR Parts into the system. This enables:"
              })
            ]
          }),
          new Paragraph({
            text: "Cross-referencing between related regulations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Comprehensive compliance mapping",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Multi-part configuration capabilities",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "Step 3: Ingest Policy Documents",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Policy documents supplement the CFR regulations. Click "
              }),
              new TextRun({
                text: "\"Ingest Policy\"",
                bold: true
              }),
              new TextRun({
                text: " to add:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "SAFO (Safety Alert for Operators)",
                bold: true
              }),
              new TextRun({
                text: " - Urgent safety information"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "InFO (Information for Operators)",
                bold: true
              }),
              new TextRun({
                text: " - General guidance and best practices"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Advisory Circular",
                bold: true
              }),
              new TextRun({
                text: " - Non-regulatory guidance on compliance methods"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Legal Interpretation",
                bold: true
              }),
              new TextRun({
                text: " - FAA Chief Counsel interpretations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Policy Notice",
                bold: true
              }),
              new TextRun({
                text: " - Internal FAA policy guidance"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "FAA Order",
                bold: true
              }),
              new TextRun({
                text: " - Inspector procedures and requirements (including 8900.1 Volumes 1-16)"
              })
            ]
          }),

          new Paragraph({
            text: "The Six Tabs",
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
                text: "Your regulatory framework hierarchy:"
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
                text: " - Your selected core regulation with version tracking and status"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Core Attachments",
                bold: true
              }),
              new TextRun({
                text: " - FAA Orders that always apply to your operation type"
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
                text: " - Related CFR parts that apply based on your authorizations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Hierarchy Visualization",
                bold: true
              }),
              new TextRun({
                text: " - Visual diagram showing regulation relationships"
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
                text: "Manage compliance checklists from various sources. The system now supports checklists from any FAR Part."
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
            text: "2. Enter a name and version number",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "3. Select the source (FAA, TCPM, Regional FSDO, Operator, or Industry)",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "4. Link to ANY regulatory framework from your initialized parts",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "5. Enter checklist items in pipe-delimited format",
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "6. Click \"Import Checklist\"",
            spacing: { after: 200 }
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
                text: "Track FAA inspector preferences across all FAR Parts:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Inspector Profiles",
                bold: true
              }),
              new TextRun({
                text: " - Region, office, audit count, strictness score, and focus areas"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Prediction Accuracy",
                bold: true
              }),
              new TextRun({
                text: " - AI-powered predictions for checklist ordering, questions, and focus areas"
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
                text: "Manage compliance evidence with blockchain verification:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Evidence Stats",
                bold: true
              }),
              new TextRun({
                text: " - Total indexed, blockchain-verified, and pending verification counts"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Evidence-On-Demand API",
                bold: true
              }),
              new TextRun({
                text: " - Instant retrieval by checklist item or regulatory reference"
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
                text: "Generate audit documentation for any FAR Part:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Regulation-Sorted Packet",
                bold: true
              }),
              new TextRun({
                text: " - Evidence organized by regulatory reference"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Checklist-Sorted Packet",
                bold: true
              }),
              new TextRun({
                text: " - Evidence organized by checklist item order"
              })
            ]
          }),

          new Paragraph({
            text: "6. Regulatory Updates Tab (NEW)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Monitor changes across all your configured FAR Parts:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Change Detection",
                bold: true
              }),
              new TextRun({
                text: " - Automatic monitoring for CFR amendments"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Policy Alerts",
                bold: true
              }),
              new TextRun({
                text: " - New SAFOs, InFOs, and Advisory Circulars affecting your operations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Impact Assessment",
                bold: true
              }),
              new TextRun({
                text: " - Analysis of how changes affect your compliance posture"
              })
            ]
          }),

          new Paragraph({
            text: "Multi-Part Compliance",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Many aviation organizations operate under multiple regulatory frameworks simultaneously. BCCS-US uniquely handles this through Multi-Part Configurations:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "Example Configurations:",
                bold: true
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Part 142 Training Center with Part 121 Airline Training",
                bold: true
              }),
              new TextRun({
                text: " - Combines training center requirements with airline-specific training approvals"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({
                text: "Part 145 Repair Station with Part 121 Support",
                bold: true
              }),
              new TextRun({
                text: " - Maintenance requirements plus airline operations support"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "Part 141 School with Part 61 Exceptions",
                bold: true
              }),
              new TextRun({
                text: " - Pilot school operations with individual certification requirements"
              })
            ]
          }),

          new Paragraph({
            text: "FAA Order 8900.1 Integration",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "The system includes all 16 volumes of FAA Order 8900.1, the Flight Standards Information Management System (FSIMS):"
              })
            ]
          }),
          new Paragraph({
            text: "Volume 1 - Program Tracking and Reporting (PTR)",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 2 - Air Operator and Air Agency Certification and Application Process",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 3 - General Technical Administration",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 4 - Aircraft Equipment and Operational Authorizations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 5 - Airman Certification",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 6 - Surveillance",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 7 - Investigations",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 8 - Designee Management",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 9 - Flight Standards Programs",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 10 - Safety Assurance System",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 11 - Flight Technologies and Procedures",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 12 - International Aviation",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 13 - Commercial Space Transportation",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 14 - Compliance and Enforcement",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 15 - Designated Representative Management",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Volume 16 - Unmanned Aircraft Systems (UAS)",
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
                text: "1. Choose your spine carefully",
                bold: true
              }),
              new TextRun({
                text: " - Select the FAR Part that most directly governs your primary operation"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "2. Initialize related parts",
                bold: true
              }),
              new TextRun({
                text: " - Add FAR Parts that commonly intersect with your operations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "3. Ingest policy documents regularly",
                bold: true
              }),
              new TextRun({
                text: " - Keep up with SAFOs, InFOs, and Advisory Circulars"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "4. Monitor regulatory updates",
                bold: true
              }),
              new TextRun({
                text: " - Check the Regulatory Updates panel for changes affecting your operations"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "5. Link evidence to regulations",
                bold: true
              }),
              new TextRun({
                text: " - Index compliance evidence as events occur, not before audits"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "6. Use blockchain verification",
                bold: true
              }),
              new TextRun({
                text: " - Verify critical evidence on the blockchain for immutable audit trails"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "7. Generate audit packets regularly",
                bold: true
              }),
              new TextRun({
                text: " - Maintain current documentation for surprise inspections"
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
                text: "The dashboard displays your compliance overview:"
              })
            ]
          }),
          new Paragraph({
            text: "Active Frameworks - Number of FAR Parts configured",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Harmonized Checklists - Number of imported checklists across all parts",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Tracked Inspectors - Number of inspector profiles",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Compliance Score - Overall compliance percentage",
            bullet: { level: 0 },
            spacing: { after: 50 }
          }),
          new Paragraph({
            text: "Policy Documents - Number of ingested SAFOs, InFOs, and ACs",
            bullet: { level: 0 },
            spacing: { after: 200 }
          }),

          new Paragraph({
            text: "Technical Reference: API Endpoints",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "For system integrators, the following API endpoints are available:"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/far-parts",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - List all available FAR Parts"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/frameworks/spines",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get configured regulatory spines"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/frameworks/select-spine",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Select primary spine"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/policy-documents/ingest",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Ingest policy document"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 50 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "GET /api/adaptive-compliance/regulatory-updates",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Get recent regulatory changes"
              })
            ]
          }),
          new Paragraph({
            spacing: { after: 200 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: "POST /api/adaptive-compliance/multi-part-config",
                font: "Courier New",
                size: 20
              }),
              new TextRun({
                text: " - Create multi-part configuration"
              })
            ]
          }),

          new Paragraph({
            spacing: { before: 600 },
            alignment: AlignmentType.CENTER,
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" }
            },
            children: [
              new TextRun({
                text: "BCCS-US Universal Adaptive Compliance System",
                bold: true,
                size: 22
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Patent Pending",
                italics: true,
                color: "B91C1C",
                size: 20
              })
            ]
          }),
          new Paragraph({
            spacing: { before: 200 },
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
