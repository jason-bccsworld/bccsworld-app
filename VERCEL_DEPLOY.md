# BCCS-US — Vercel Deployment Guide

## Overview

This guide walks you through deploying BCCS-US to Vercel with a Neon PostgreSQL database.

**Authentication**: The platform now uses username/password authentication (replacing Replit Auth). Your first admin account is bootstrapped via environment variables.

---

## Prerequisites

- [Vercel account](https://vercel.com) (Hobby or Pro plan)
- [Neon account](https://neon.tech) for PostgreSQL database
- Your BCCS-US codebase pushed to a GitHub/GitLab/Bitbucket repository

---

## Step 1: Set Up the Database (Neon)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project named `bccs-us`
3. Copy the **Connection String** from the Neon dashboard — it looks like:
   ```
   postgresql://user:password@hostname.neon.tech/dbname?sslmode=require
   ```
4. You will use this as `DATABASE_URL` in the next step

---

## Step 2: Push the Repository to GitHub

```bash
git init
git add .
git commit -m "BCCS-US production build"
git remote add origin https://github.com/yourusername/bccs-us.git
git push -u origin main
```

---

## Step 3: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect the configuration from `vercel.json`
4. **Before clicking Deploy**, add all required environment variables (see Step 4)

---

## Step 4: Configure Environment Variables in Vercel

In the Vercel project settings → **Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Your Neon connection string |
| `SESSION_SECRET` | `<random 32+ chars>` | Generate: `openssl rand -base64 32` |
| `ADMIN_EMAIL` | `admin@yourorg.com` | First admin account email |
| `ADMIN_PASSWORD` | `<strong password>` | First admin account password |
| `OPENAI_API_KEY` | `sk-...` | Required for AI features |
| `NODE_ENV` | `production` | Required |

**Optional variables:**
| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Legacy Data Transfer AI feature |
| `ETHEREUM_RPC_URL` | Blockchain features (Ethereum) |
| `POLYGON_RPC_URL` | Blockchain features (Polygon) |

---

## Step 5: Initialize the Database Schema

After the first deployment, run the database migration to create all tables.

**Option A — Using Neon's SQL Editor:**
1. Open the Neon dashboard → SQL Editor
2. Run: connect your Drizzle schema by running `npm run db:push` locally against the Neon database URL

**Option B — Run locally against production:**
```bash
DATABASE_URL="your-neon-connection-string" npm run db:push
```

This creates all required tables including:
- `sessions` (required for authentication)
- `users` (user accounts with password hashes)
- All aviation compliance tables

---

## Step 6: First Login

1. Visit your Vercel deployment URL
2. Click **Sign In** on the landing page
3. Log in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in environment variables
4. The admin account is automatically created on first server start

> **Security**: Change your admin password after first login via the Settings page.

---

## Step 7: Create Additional User Accounts

As an admin, you can create additional accounts by directly inserting users into the database with hashed passwords, or by building out a user management UI in the admin dashboard.

To generate a password hash for manual insertion:
```javascript
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('your-password', 12);
console.log(hash); // Insert this into the password_hash column
```

---

## Build Configuration

The `vercel.json` configures:
- **Build command**: `npm run build` (Vite frontend + Express backend)
- **Serverless function**: `api/index.ts` wraps the entire Express app
- **Routing**: All requests go through the Express app which serves both the API and the React frontend

---

## Troubleshooting

### "Cannot connect to database"
- Verify `DATABASE_URL` is set correctly in Vercel environment variables
- Ensure the Neon connection string includes `?sslmode=require`
- Check Neon dashboard to confirm the database is active

### "Invalid credentials" on login
- Confirm `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in Vercel environment variables
- The admin user is created only if it doesn't already exist
- If you've changed credentials, update via the Neon SQL editor

### Build fails
- Ensure all required environment variables are set before building
- Check Vercel build logs for specific TypeScript or module errors

### Sessions not persisting
- Confirm the `sessions` table exists in your database (`npm run db:push`)
- Verify `SESSION_SECRET` is set and is a long, random string

---

## Database Tables Created

The schema creates these core tables (among others):

| Table | Purpose |
|---|---|
| `sessions` | User session storage |
| `users` | User accounts |
| `aircraft_registry` | Aircraft records |
| `documents` | Uploaded compliance documents |
| `checklist_schemas` | Compliance checklists |
| `checklist_version_history` | Version tracking |
| `faa_policy_documents` | SAFOs, InFOs, ACs |
| `regulatory_changes` | Regulatory update log |

---

## Support

For technical issues, contact your platform administrator or refer to the platform documentation available via the Tutorial button on the Adaptive Compliance page.
