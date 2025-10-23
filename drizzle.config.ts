import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_POSTGRES_URL_NON_POOLING || process.env.DB_POSTGRES_URL!,
    ssl: true,
  },
} satisfies Config;
