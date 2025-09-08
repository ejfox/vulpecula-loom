import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create the connection string
const connectionString = process.env.DATABASE_URL || 
  "postgresql://postgres:%40TnN_QbF7aD_39F@postgres.ejfox.tools:5432/postgres";

console.log("🔌 Connecting to database...");

// Create the postgres connection
const client = postgres(connectionString, {
  ssl: false, // Adjust based on your PostgreSQL setup
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create the drizzle instance
export const db = drizzle(client, { schema });

console.log("✅ Database connection established");