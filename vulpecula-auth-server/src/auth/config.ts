import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/connection";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true when you have email configured
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  rateLimit: {
    window: 60, // 1 minute window
    max: 100, // 100 requests per window
  },
  trustedOrigins: [
    "http://localhost:3344", // Vite dev server
    "http://localhost:5173", // Alternative Vite port
    "vulpecula://", // Electron app
  ],
  cors: {
    enabled: true,
    allowCredentials: true,
    origin: [
      "http://localhost:3344",
      "http://localhost:5173",
      "vulpecula://"
    ],
  },
});