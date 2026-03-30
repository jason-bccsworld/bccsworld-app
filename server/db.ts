import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("[db] WARNING: DATABASE_URL is not set — database queries will fail at runtime.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://localhost/placeholder" });
export const db = drizzle({ client: pool, schema });