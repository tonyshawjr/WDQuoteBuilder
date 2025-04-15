import { pgTable, text, serial, integer, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
});

// Project types table
export const projectTypes = pgTable("project_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  basePrice: doublePrecision("base_price").notNull(),
});

export const insertProjectTypeSchema = createInsertSchema(projectTypes).pick({
  name: true,
  basePrice: true,
});

// Features table
export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  projectTypeId: integer("project_type_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  pricingType: text("pricing_type").notNull(), // 'fixed' or 'hourly'
  flatPrice: doublePrecision("flat_price"),
  hourlyRate: doublePrecision("hourly_rate"),
  estimatedHours: doublePrecision("estimated_hours"),
  supportsQuantity: boolean("supports_quantity").default(false),
});

export const insertFeatureSchema = createInsertSchema(features).pick({
  projectTypeId: true,
  name: true,
  description: true,
  category: true,
  pricingType: true,
  flatPrice: true,
  hourlyRate: true,
  estimatedHours: true,
  supportsQuantity: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ProjectType = typeof projectTypes.$inferSelect;
export type InsertProjectType = z.infer<typeof insertProjectTypeSchema>;

export type Feature = typeof features.$inferSelect;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;

// Type for selected feature with quantity
export type SelectedFeature = Feature & {
  quantity: number;
};
