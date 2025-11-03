import type { Config } from "drizzle-kit";

const databaseUrl = process.env.DB_POSTGRES_URL_NON_POOLING || process.env.DB_POSTGRES_URL!;
const isLocal = databaseUrl.includes('localhost');

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
    ssl: !isLocal, // Only use SSL for remote databases
  },
} satisfies Config;
