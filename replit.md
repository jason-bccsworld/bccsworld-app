# Blockchain Continuous Compliance Systems (BCCS)

## Overview

This is a full-stack web application for aviation compliance tracking that uses AI-powered document processing and blockchain-secured record keeping. The system allows users to upload training documents, extract data using OCR and NLP, validate the information, and maintain immutable audit trails.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL via Neon Database
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit's OpenID Connect integration
- **Session Management**: PostgreSQL-backed sessions

### Key Technologies
- **AI/ML**: OpenAI GPT-4o for natural language processing
- **OCR**: Tesseract.js for optical character recognition
- **File Processing**: Multer for file uploads
- **Blockchain**: Custom hash generation for immutable records

## Key Components

### Data Processing Pipeline
1. **Document Upload**: Users upload training documents (PDF, images, spreadsheets)
2. **OCR Processing**: Extract text from images and PDFs using Tesseract.js
3. **NLP Analysis**: Use OpenAI GPT-4o to extract structured data with confidence scores
4. **Human Validation**: Allow users to review and correct AI-extracted data
5. **Blockchain Hashing**: Generate cryptographic hashes for audit trail integrity

### Database Schema
- **Users**: Authentication and profile management
- **Organizations**: Training schools and regulatory bodies
- **Documents**: Uploaded files with processing status
- **Extracted Data**: AI-extracted fields with confidence scores
- **Training Events**: Core compliance records
- **Audit Logs**: Complete activity tracking

### Authentication System
- **Provider**: Replit OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions
- **Roles**: Admin, Instructor, Auditor, Viewer
- **Security**: HTTP-only cookies, secure sessions

## Data Flow

1. **User Authentication**: Users authenticate via Replit OIDC
2. **Document Upload**: Files are uploaded to server storage
3. **Processing Queue**: Documents enter OCR/NLP pipeline
4. **Data Extraction**: AI extracts structured information
5. **Validation Interface**: Users review and validate extracted data
6. **Record Creation**: Validated data creates training events
7. **Blockchain Logging**: Events are hashed and logged
8. **Audit Trail**: All actions are recorded for compliance

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **@tanstack/react-query**: Client-side state management
- **@radix-ui/react-\***: UI component primitives
- **drizzle-orm**: Type-safe database operations
- **openai**: GPT-4o API integration
- **tesseract.js**: OCR processing
- **passport**: Authentication middleware
- **multer**: File upload handling

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **tailwindcss**: Utility-first CSS framework
- **esbuild**: Server-side bundling

## Deployment Strategy

### Development
- **Server**: Node.js with tsx for TypeScript execution
- **Client**: Vite dev server with HMR
- **Database**: Neon PostgreSQL instance
- **Environment**: Replit development environment

### Production
- **Build Process**: 
  - Frontend: Vite build to `dist/public`
  - Backend: esbuild bundle to `dist/index.js`
- **Server**: Node.js production server
- **Static Files**: Served from build output
- **Database**: Production PostgreSQL instance

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API access
- `SESSION_SECRET`: Session encryption key
- `REPLIT_DOMAINS`: Authentication domain configuration

## Changelog

```
Changelog:
- July 04, 2025. Initial setup
- July 04, 2025. Fixed OpenAI API key integration and document processing pipeline
- July 04, 2025. Resolved environment variable loading issues in server modules
- July 04, 2025. Successfully demonstrated complete document-to-blockchain workflow
- July 04, 2025. Resolved OCR mock data issue, implemented real PDF processing for user's ATP certificate
- July 04, 2025. Successfully extracted and displayed authentic pilot data: Frederick Nichols, Certificate 044918, ATP
- July 04, 2025. Updated field labels to match ATP certificate format: Certificate Number, D.O.B, Address
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```