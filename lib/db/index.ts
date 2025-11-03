import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { Pool } from "pg";
import { sql as vercelSql } from "@vercel/postgres";
import * as schema from "./schema";

// Determine if we're using a local database
const databaseUrl = process.env.DB_POSTGRES_URL_NON_POOLING || process.env.DB_POSTGRES_URL!;
const isLocal = databaseUrl.includes('localhost');

// Use appropriate database driver based on environment
export const db = isLocal
  ? drizzleNode(new Pool({ connectionString: databaseUrl }), { schema })
  : drizzleVercel(vercelSql, { schema });

// Export schema for use in queries
export { schema };
