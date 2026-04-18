import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("[db] WARNING: No database URL configured — database queries will fail at runtime.");
} else {
  const dbLabel = process.env.NEON_DATABASE_URL ? "Neon (cloud)" : "local PostgreSQL";
  console.log(`[db] Connecting to ${dbLabel}`);
}

export const pool = new Pool({ connectionString: connectionString || "postgresql://localhost/placeholder" });
export const db = drizzle({ client: pool, schema });
