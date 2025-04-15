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

// Pages table
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  pricePerPage: doublePrecision("price_per_page").notNull(),
  projectTypeId: integer("project_type_id"), // Optional
  defaultQuantity: integer("default_quantity").default(1),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertPageSchema = createInsertSchema(pages).pick({
  name: true,
  description: true,
  pricePerPage: true,
  projectTypeId: true,
  defaultQuantity: true,
  isActive: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ProjectType = typeof projectTypes.$inferSelect;
export type InsertProjectType = z.infer<typeof insertProjectTypeSchema>;

export type Feature = typeof features.$inferSelect;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;

export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

// Type for selected feature with quantity
export type SelectedFeature = Feature & {
  quantity: number;
};

// Type for selected page with quantity
export type SelectedPage = Page & {
  quantity: number;
};
