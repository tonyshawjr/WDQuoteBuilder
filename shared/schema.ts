import { pgTable, text, serial, integer, boolean, doublePrecision, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).pick({
  businessName: true,
});

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
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
  projectTypeId: integer("project_type_id"), // Now optional for backward compatibility
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default(""),
  pricingType: text("pricing_type").notNull(), // 'fixed' or 'hourly'
  flatPrice: doublePrecision("flat_price"),
  hourlyRate: doublePrecision("hourly_rate"),
  estimatedHours: doublePrecision("estimated_hours"),
  supportsQuantity: boolean("supports_quantity").default(false),
  forAllProjectTypes: boolean("for_all_project_types").default(false),
});

// Feature to project type relations table
export const featureProjectTypes = pgTable("feature_project_types", {
  id: serial("id").primaryKey(),
  featureId: integer("feature_id").notNull().references(() => features.id, { onDelete: "cascade" }),
  projectTypeId: integer("project_type_id").notNull().references(() => projectTypes.id, { onDelete: "cascade" }),
}, (t) => ({
  featureProjectTypeIdx: uniqueIndex("feature_project_type_idx").on(t.featureId, t.projectTypeId),
}));

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
  forAllProjectTypes: true,
});

export const insertFeatureProjectTypeSchema = createInsertSchema(featureProjectTypes).pick({
  featureId: true,
  projectTypeId: true,
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
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingsSchema>;

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

// Quote management schema
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  projectTypeId: integer("project_type_id").references(() => projectTypes.id),
  clientName: text("client_name").notNull(),
  businessName: text("business_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  leadStatus: text("lead_status").notNull().default("In Progress"),
  closeDate: text("close_date"),
  totalPrice: doublePrecision("total_price").notNull(),
  createdAt: text("created_at").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
  createdBy: text("created_by"),
  updatedBy: text("updated_by")
});

export const quoteFeatures = pgTable("quote_features", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  featureId: integer("feature_id").notNull().references(() => features.id),
  quantity: integer("quantity").notNull().default(1),
  price: doublePrecision("price").notNull()
});

export const quotePages = pgTable("quote_pages", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  pageId: integer("page_id").notNull().references(() => pages.id),
  quantity: integer("quantity").notNull().default(1),
  price: doublePrecision("price").notNull()
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertQuoteFeatureSchema = createInsertSchema(quoteFeatures).omit({
  id: true
});

export const insertQuotePageSchema = createInsertSchema(quotePages).omit({
  id: true
});

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type QuoteFeature = typeof quoteFeatures.$inferSelect;
export type InsertQuoteFeature = z.infer<typeof insertQuoteFeatureSchema>;

export type QuotePage = typeof quotePages.$inferSelect;
export type InsertQuotePage = z.infer<typeof insertQuotePageSchema>;

export type FeatureProjectType = typeof featureProjectTypes.$inferSelect;
export type InsertFeatureProjectType = z.infer<typeof insertFeatureProjectTypeSchema>;
