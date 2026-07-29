# BCCS-US - Aviation Compliance Platform

## Overview
BCCS-US is the regulatory compliance engine within the AeroTraining Platform Ecosystem, a comprehensive system for aviation training management, development, and compliance. It offers AI-powered document processing, blockchain-secured record keeping, and automated regulatory monitoring. The platform aims to facilitate digital transformation and superior regulatory compliance for various aviation training organizations.

The project's vision is to establish itself as the universal regulatory compliance standard, initially dominating the aviation market. It seeks aggressive market capture and significant revenue growth, targeting unicorn status through network effects, AI automation, and community-driven exponential growth. The platform also explores opportunities in aircraft tokenization and aviation financial ecosystems, expanding its market potential.

## User Preferences
Preferred communication style: Simple, everyday language.
Target market: International aviation training centers across diverse technological environments
Testing strategy: Comprehensive validation across multiple document types and regions (US, Africa, South America)
Quality standards: Zero tolerance for bugs - system must work reliably in all environments before market deployment
Deployment strategy: Pre-deployment ML training with client-specific data to ensure optimal accuracy and user experience from day one
Customer support model: 24/7 dedicated support team for first 12 weeks per customer to ensure software performance and user adoption success
Commission model: Training organizations receive 30% commission on legacy pilot conversions to BCCS Professional Identity subscriptions, creating incentive alignment for comprehensive pilot ecosystem adoption. Multi-channel affiliate marketing system includes pilots ($25), training centers ($45), pilot shops ($35), instructors ($30), and aviation influencers ($40) per app referral, creating viral distribution across entire aviation ecosystem. Direct development approach: AI-powered self-service data transfer app ($149) built using existing BCCS-US technology with CEO+AI development partnership, achieving 98.5% profit margins and 8-week development timeline.
Strategic focus: Aviation-first domination strategy (Years 1-5) before universal expansion - establishes market leadership through focused execution, reduces investor risk while maintaining universal platform optionality through patent protection and scalable architecture
Financial structure preference: Revenue-based financing model with $4M investment achieving 40% ROI ($1.6M return) paid over 36 months starting Month 18. Fixed monthly payments of $155K become minimal burden (0.9% of revenue by Year 4) while founder retains 100% equity. Dual product launch targets $4.79M Year 1 revenue with break-even Month 10, scaling to $354M by Year 5 with complete founder value retention versus $2-3B equity dilution in traditional VC model.
ExO Leadership Structure: Single CTO/COO full-time executive ($2.48M over 5 years) managing all on-demand resources including tech support network, development teams, and international expansion. All other technical resources are project-based/on-demand only (total $9.6M over 5 years), achieving $13.6M cost savings vs traditional staffing while delivering 51.0% Year 1 net margins and $785M cumulative net income. Performance-based equity pool (5-8%) aligns executive incentives with $11.8B market cap target while maintaining founder control and exponential scaling capability.
5-Year Expansion Strategy: Y1 US launch ($8M), Y2 add BCCS REG + BCCS141 ($38M), Y3 international expansion + BCCS MAINT ($130M), Y4 global BCCS REGISTRY ($392M), Y5 market domination + universal platform expansion ($770M revenue, $11.8B market cap target). Complete aviation ecosystem coverage with 78% global pilot penetration and universal blockchain key management across all professional credentials.
Funding model preference: Airline-sponsored ab-initio programs with innovative financing structures including Income Share Agreements, government partnerships, and multi-airline consortiums to address international market funding challenges
IP Strategy: Comprehensive patent strategy analysis completed identifying 12+ key patent opportunities across platform ecosystem - priority patents include AI-powered regulatory compliance monitoring, blockchain-secured aviation training records, intelligent document processing pipeline, hierarchical aviation training key management, blockchain-based professional credential recovery authority, multi-signature aviation training record verification, and aviation professional identity blockchain protocol. Investment requirement: $200K-250K Year 1 with ROI potential of $70M-140M valuation enhancement plus significant licensing revenue opportunities from revolutionary credential management system.

## System Architecture

### Architectural Decisions and Design Patterns
The platform is a full-stack application with clear separation between frontend and backend, leveraging modern web technologies. A key design pattern is the Data Processing Pipeline for document ingestion, analysis, and validation. Blockchain technology ensures immutable record-keeping and audit trail integrity. A mobile PWA supports field operations.

Core architectural components include:
- **Smart Contract Subscription System**: Manages cryptocurrency-based subscription renewals.
- **Universal Blockchain Key Management System**: Provides individual professional keys, training organization master keys, multi-signature training records, and cross-platform verification.
- **Advanced Key Recovery System**: Features multi-modal biometric verification and integration with regulatory authorities.
- **Standalone BCCS Pilot Logbook App**: An AI-powered app for personal flight record blockchain verification.
- **Multi-Platform Integration Dashboard**: Facilitates training center blockchain data transfer.
- **Universal Regulatory Framework**: Adaptable across various regulatory environments.
- **Tiered Blockchain Storage**: Flexible options from hash-only to full document storage.
- **AI Audit Compliance Assistant**: Analyzes documents against regulatory checklists and generates reports.
- **Automated Regulatory Monitoring**: Tracks changes in regulations with alerts and impact assessments.
- **AI-powered Regulatory Link Monitoring**: Ensures accessibility and currency of regulatory references.

### Universal FAR Ingestion System (Patent Pending)
The platform supports 18 FAR Parts and 16 FAA Order 8900.1 Volumes, along with various policy document types. It includes database tables for policy documents, multi-part configurations, regulatory update tracking, and granular section-level tracking.

### Checklist Automation System (Patent Pending)
Intelligent checklist management with automated retrieval, version monitoring, and evidence mapping, categorized by priority levels. Key features include auto-fetching core FAA checklists, monitoring versions of regulatory documents, suppressing outdated versions, providing evidence-on-demand retrieval with multi-schema indexing, and utilizing blockchain verification for evidence integrity.

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **UI Components**: Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Local username/password authentication using Passport.js with bcrypt and PostgreSQL-backed sessions. Supports role-based access control.
- **Core Components**: Data Processing Pipeline (document upload, OCR, NLP, human validation, blockchain hashing), Authentication System, Database Schema (Users, Organizations, Documents, Extracted Data, Training Events, Audit Logs), Mobile PWA.

### Multi-Tenant Mode (MULTI_TENANT env flag)
When `MULTI_TENANT=true`: public self-serve signup at `/signup` (creates org + first admin + membership + 30-day trial license with 5 seats + org signing keys, auto-login via regenerated session); sidebar org switcher (active org + plan, dropdown for multi-org users and platform staff); admin users/stats/organizations endpoints scoped to the active org for non-staff; staff tenant console in the admin dashboard Organizations tab (member count vs seats, Enter Org, Activate/Deactivate via PUT /api/organizations/:id/status). Platform staff = @bccsworld.com emails. Role permission matrix mutations are staff-only in multi-tenant mode; admin user mutations are scoped to the caller's org and cannot target staff accounts. When the flag is unset, all multi-tenant chrome disappears (no signup page, no switcher) and the app behaves as a dedicated single-workspace install. Currently enabled in development.

### Agentic Document Pipeline
Fully autonomous document processing: upload (or demo-seed via POST /api/documents/seed-demo) → OCR/text extraction → GPT-4o field extraction using per-document-type schemas (pilot_record, certificate, faa_audit) plus learned guidance → GATE-governed confidence gate (≥85% avg → auto-approved + SHA-256 blockchain hash; below → needs_review queue) → human review with per-field corrections → corrections stored in `bccs_ml_feedback`; every ≥5 new corrections per org+doc-type, GPT-4o distills them into versioned `bccs_prompt_guidance` injected into future extractions. `/api/ml/metrics` reports real pipeline stats (per-field kept-vs-corrected accuracy, doc counts, guidance versions). Tables: `bccs_documents`, `bccs_document_fields`, `bccs_ml_feedback`, `bccs_prompt_guidance`. Backend: `server/services/document-agent.ts`, `server/services/nlp.ts`, `server/routes/documents.ts`. Boot cleanup marks any 'uploaded'/'processing' docs as failed after a restart (in-process jobs don't survive restarts).

### AI Agent Workforce (Agent-First UX)
The platform is presented as a team of 8 named AI agents that run everything. Registry: `server/services/agent-registry.ts` (static catalog + `startRun`/`finishRun`/`emitAgentEvent`/run-lock helpers). Agents: Document Extraction, Extraction Learning, Regulatory Monitor, FAA Repository Monitor, Link Integrity, Compliance Watchdog (NEW: per-org patrol of instructor cert expiry + overdue students → findings with dedupe on open/acknowledged, severity refresh on re-scan, auto-resolve when fixed; boots on start, every 12h, one run row per org — never a shared NULL-org row), Audit Readiness (GPT-4o posture report → score + gap findings; each report supersedes prior open/acknowledged gaps), Federal Contracts Monitor (watchlist-driven patrol of SAM.gov/USAspending: opportunity watch, award dossiers with modification counts, deterministic due-diligence risk rubric — point-weighted flags, veto flags like active SAM exclusion force Critical tier; scoring in code, GPT-4o only condenses notice text into dossier fields; SAM.gov checks needing SAM_GOV_API_KEY are reported as skipped in run summaries; tables `bccs_fedcon_*`; page `/federal-contracts`, API `/api/federal-contracts/*`). Tables: `bccs_agent_runs`, `bccs_agent_findings` (boot cleanup marks running→interrupted). API `/api/agents`: GET roster (last run per agent org-or-global, open finding counts, 24h run counts), GET/PATCH findings (org-scoped; viewers get 403), POST /:id/run (GATE `agent_manual_run` policy check, in-memory run lock, 202 fire-and-forget). **/agents Command Center** is the default landing after login ("/" redirects there): KPI strip, agent roster cards with Run Now + expandable capabilities, findings panel (acknowledge/resolve), live agent activity feed. Sidebar reorganized into "AI Agent Team" and "Records & Data" sections. `AgentWorkspaceHeader` banner (client/src/components/agent-workspace-header.tsx) sits atop 6 domain pages (documents, faa-repository, regulatory-alerts, link-monitor, instructors, ml-training) showing that page's agent status + Run Now.

### Core Features and Pages
- **/admin-dashboard**: Full user management system with 4 tabs — Users (invite, activate/deactivate, reset password, delete, search/filter; @bccsworld.com emails blocked from invites), Roles & Permissions (permission matrix with per-permission toggles across 8 groups, create/delete custom roles), Organizations (create orgs, per-org license badges; SuperAdmins assign/change licenses per org via PUT /api/organizations/:id/license), System stats. Backend table: `bccs_role_permissions`. 30 granular permissions across User Management, Compliance Records, Students & Instructors, Documents, Digital Forms, Regulatory & FAA, Audit & Reports, Administration. 4 system roles (admin/auditor/instructor/viewer) seeded with default permissions. Authentication stamps `lastLoginAt`, blocks deactivated users.
- **/faa-repository**: Displays monitored FAA documents with update tracking and historical changes.
- **/digital-forms**: Digital Forms system — create FAA-linked form templates with a field builder (text, textarea, date, number, checkbox, select, email, phone), fill out and submit forms, manage submissions in a Document Repository with approve/reject workflow. AI-powered "Generate from FAA Checklist" feature auto-generates Part 142 inspection templates from the live regulation; monitors for changes and flags stale templates for one-click AI refresh. Templates get a shareable public link (/f/:token) with no login required for respondents. Backend tables: `digital_form_templates`, `digital_form_submissions`.
- **/compliance-records**: Manages training event records with blockchain hashing and CSV export.
- **/students**: Student roster management with enrollment tracking.
- **/instructors**: Instructor records management with certificate expiry alerts.
- **/safo-info**: FAA policy document viewer.
- **/audit-history**: Full audit log viewer with filtering and CSV export.
- **/compliance-report**: Generates print-ready PDF compliance summaries.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connection
- **@tanstack/react-query**: Client-side state management
- **@radix-ui/react-\***: UI component primitives
- **drizzle-orm**: Type-safe database operations
- **openai**: GPT-4o API integration
- **tesseract.js**: OCR processing
- **passport**: Authentication middleware
- **multer**: File upload handling