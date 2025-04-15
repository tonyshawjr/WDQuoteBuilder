import { db } from "./db";
import { and, eq, isNull } from "drizzle-orm";
import {
  users,
  projectTypes,
  features,
  pages,
  quotes,
  quoteFeatures,
  quotePages,
  type User,
  type InsertUser,
  type ProjectType,
  type InsertProjectType,
  type Feature,
  type InsertFeature,
  type Page,
  type InsertPage,
  type Quote,
  type InsertQuote,
  type QuoteFeature,
  type QuotePage,
  type SelectedFeature,
  type SelectedPage
} from "@shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Project type operations
  async getProjectTypes(): Promise<ProjectType[]> {
    return db.select().from(projectTypes);
  }

  async getProjectType(id: number): Promise<ProjectType | undefined> {
    const [projectType] = await db.select().from(projectTypes).where(eq(projectTypes.id, id));
    return projectType;
  }

  async createProjectType(projectType: InsertProjectType): Promise<ProjectType> {
    const [newProjectType] = await db.insert(projectTypes).values(projectType).returning();
    return newProjectType;
  }

  async updateProjectType(id: number, projectType: InsertProjectType): Promise<ProjectType | undefined> {
    const [updatedProjectType] = await db
      .update(projectTypes)
      .set(projectType)
      .where(eq(projectTypes.id, id))
      .returning();
    return updatedProjectType;
  }

  async deleteProjectType(id: number): Promise<boolean> {
    const result = await db.delete(projectTypes).where(eq(projectTypes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Feature operations
  async getFeatures(): Promise<Feature[]> {
    return db.select().from(features);
  }

  async getFeaturesByProjectType(projectTypeId: number): Promise<Feature[]> {
    return db.select().from(features).where(eq(features.projectTypeId, projectTypeId));
  }

  async getFeature(id: number): Promise<Feature | undefined> {
    const [feature] = await db.select().from(features).where(eq(features.id, id));
    return feature;
  }

  async createFeature(feature: InsertFeature): Promise<Feature> {
    const [newFeature] = await db.insert(features).values(feature).returning();
    return newFeature;
  }

  async updateFeature(id: number, feature: InsertFeature): Promise<Feature | undefined> {
    const [updatedFeature] = await db
      .update(features)
      .set(feature)
      .where(eq(features.id, id))
      .returning();
    return updatedFeature;
  }

  async deleteFeature(id: number): Promise<boolean> {
    const result = await db.delete(features).where(eq(features.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Page operations
  async getPages(): Promise<Page[]> {
    return db.select().from(pages);
  }

  async getActivePagesOnly(): Promise<Page[]> {
    return db.select().from(pages).where(eq(pages.isActive, true));
  }

  async getPagesByProjectType(projectTypeId: number): Promise<Page[]> {
    return db.select()
      .from(pages)
      .where(
        and(
          eq(pages.projectTypeId, projectTypeId),
          eq(pages.isActive, true)
        )
      );
  }

  async getPage(id: number): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page;
  }

  async createPage(page: InsertPage): Promise<Page> {
    const [newPage] = await db.insert(pages).values(page).returning();
    return newPage;
  }

  async updatePage(id: number, page: InsertPage): Promise<Page | undefined> {
    const [updatedPage] = await db
      .update(pages)
      .set(page)
      .where(eq(pages.id, id))
      .returning();
    return updatedPage;
  }

  async deletePage(id: number): Promise<boolean> {
    const result = await db.delete(pages).where(eq(pages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Quote operations
  async getQuotes(): Promise<Quote[]> {
    return db.select().from(quotes);
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote;
  }

  async createQuote(
    quoteData: InsertQuote, 
    selectedFeatures: SelectedFeature[], 
    selectedPages: SelectedPage[]
  ): Promise<Quote> {
    // Set created and updated dates
    const now = new Date().toISOString();
    const quoteWithTimestamps = {
      ...quoteData,
      createdAt: now,
      updatedAt: now
    };
    
    // Create the quote
    const [newQuote] = await db.insert(quotes).values(quoteWithTimestamps).returning();
    
    // Create quote features
    if (selectedFeatures.length > 0) {
      const featureValues = selectedFeatures.map(feature => ({
        quoteId: newQuote.id,
        featureId: feature.id,
        quantity: feature.quantity,
        price: feature.pricingType === 'fixed' 
          ? (feature.flatPrice || 0) * feature.quantity
          : (feature.hourlyRate || 0) * (feature.estimatedHours || 0) * feature.quantity
      }));
      
      await db.insert(quoteFeatures).values(featureValues);
    }
    
    // Create quote pages
    if (selectedPages.length > 0) {
      const pageValues = selectedPages.map(page => ({
        quoteId: newQuote.id,
        pageId: page.id,
        quantity: page.quantity,
        price: page.pricePerPage * page.quantity
      }));
      
      await db.insert(quotePages).values(pageValues);
    }
    
    return newQuote;
  }

  async updateQuote(id: number, quoteData: Partial<InsertQuote>): Promise<Quote | undefined> {
    // Update the updatedAt timestamp
    const dataWithTimestamp = {
      ...quoteData,
      updatedAt: new Date().toISOString()
    };
    
    const [updatedQuote] = await db
      .update(quotes)
      .set(dataWithTimestamp)
      .where(eq(quotes.id, id))
      .returning();
      
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    // Due to CASCADE on delete, quote features and pages will be deleted automatically
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getQuoteFeatures(quoteId: number): Promise<QuoteFeature[]> {
    return db.select()
      .from(quoteFeatures)
      .where(eq(quoteFeatures.quoteId, quoteId));
  }

  async getQuotePages(quoteId: number): Promise<QuotePage[]> {
    return db.select()
      .from(quotePages)
      .where(eq(quotePages.quoteId, quoteId));
  }
}