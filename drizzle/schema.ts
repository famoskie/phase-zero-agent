import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
export const briefs = mysqlTable("briefs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  url: text("url").notNull(),
  companyName: text("companyName"),
  valueProposition: text("valueProposition"),
  userPainPoints: text("userPainPoints"),
  aiOpportunities: text("aiOpportunities"),
  recommendedEngagement: text("recommendedEngagement"),
  rawContent: text("rawContent"),
  // Company metrics
  foundedYear: varchar("foundedYear", { length: 16 }),
  employeeCount: varchar("employeeCount", { length: 64 }),
  fundingStage: varchar("fundingStage", { length: 64 }),
  industry: varchar("industry", { length: 128 }),
  headquarters: varchar("headquarters", { length: 128 }),
  businessModel: varchar("businessModel", { length: 64 }),
  techStack: text("techStack"),
  revenueModel: varchar("revenueModel", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Brief = typeof briefs.$inferSelect;
export type InsertBrief = typeof briefs.$inferInsert;