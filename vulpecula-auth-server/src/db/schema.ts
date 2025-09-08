import { pgTable, text, timestamp, uuid, jsonb, varchar, boolean } from "drizzle-orm/pg-core";

// Better-auth will create its own tables, but we define our custom ones here

// Chats table (replaces vulpeculachats from Supabase)
export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: text("title"),
  messages: jsonb("messages").notNull().default([]),
  metadata: jsonb("metadata").default({}),
  model: varchar("model", { length: 100 }),
  threadId: uuid("thread_id").references(() => threads.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Threads table for organizing chats
export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  chatIds: jsonb("chat_ids").default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// User settings table
export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;