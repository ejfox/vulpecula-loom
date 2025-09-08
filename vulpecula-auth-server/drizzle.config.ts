import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || 
      "postgresql://ejfox:@TnN_QbF7aD_39F@localhost:5432/postgres",
  },
  verbose: true,
  strict: true,
} satisfies Config;