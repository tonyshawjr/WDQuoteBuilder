import { db } from "./db";
import { and, eq, isNull, or } from "drizzle-orm";
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
  constructor() {
    // Initialize with a test admin user if none exists
    this.initTestUsers();
  }
  
  private async initTestUsers() {
    try {
      const adminUser = await this.getUserByUsername('admin');
      if (!adminUser) {
        console.log('Creating admin user...');
        await this.createUser({
          username: 'admin',
          password: 'admin123',
          isAdmin: true
        });
        console.log('Admin user created successfully');
      }
      
      const salesUser = await this.getUserByUsername('sales');
      if (!salesUser) {
        console.log('Creating sales user...');
        await this.createUser({
          username: 'sales',
          password: 'sales123',
          isAdmin: false
        });
        console.log('Sales user created successfully');
      }
    } catch (error) {
      console.error('Error initializing test users:', error);
    }
  }
  
  // User operations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      console.log('DB storage - Creating user with data:', JSON.stringify(user));
      
      // Ensure all required fields are present and properly typed
      const userData = {
        username: String(user.username),
        password: String(user.password),
        isAdmin: user.isAdmin === true, // Ensure this is a boolean
        email: user.email, // Include email field
        firstName: user.firstName, // Include firstName field
        lastName: user.lastName // Include lastName field
      };
      
      console.log('DB storage - Processed user data:', JSON.stringify(userData));
      
      const [newUser] = await db.insert(users).values(userData).returning();
      console.log('DB storage - User created successfully:', JSON.stringify(newUser));
      return newUser;
    } catch (error) {
      console.error('DB storage - Error creating user:', error);
      throw error;
    }
  }
  
  async updateUser(id: number, userData: InsertUser): Promise<User | undefined> {
    try {
      console.log('DB storage - Updating user with data:', JSON.stringify(userData));
      
      // Prepare the data to ensure proper types
      const processedData: Record<string, any> = {};
      
      if (userData.username !== undefined) {
        processedData.username = String(userData.username);
      }
      
      if (userData.password !== undefined) {
        processedData.password = String(userData.password);
      }
      
      if (userData.isAdmin !== undefined) {
        processedData.isAdmin = userData.isAdmin === true;
      }
      
      // Handle profile fields
      if (userData.email !== undefined) {
        processedData.email = userData.email;
      }
      
      if (userData.firstName !== undefined) {
        processedData.firstName = userData.firstName;
      }
      
      if (userData.lastName !== undefined) {
        processedData.lastName = userData.lastName;
      }
      
      console.log('DB storage - Processed update data:', JSON.stringify(processedData));
      
      const [updatedUser] = await db
        .update(users)
        .set(processedData)
        .where(eq(users.id, id))
        .returning();
        
      console.log('DB storage - User updated successfully:', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error('DB storage - Error updating user:', error);
      return undefined;
    }
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      console.log('DB storage - Deleting user with ID:', id);
      
      const result = await db
        .delete(users)
        .where(eq(users.id, id));
        
      const success = (result.rowCount ?? 0) > 0;
      console.log('DB storage - User deletion result:', success ? 'Success' : 'Failed');
      
      return success;
    } catch (error) {
      console.error('DB storage - Error deleting user:', error);
      return false;
    }
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
    // Return both project-specific pages and general pages (those with projectTypeId = null)
    return db.select()
      .from(pages)
      .where(
        and(
          or(
            eq(pages.projectTypeId, projectTypeId),
            isNull(pages.projectTypeId)
          ),
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
  
  async getQuotesByUser(userId: number): Promise<Quote[]> {
    // First get the user to get their username
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // Now query by username in the createdBy field
    return db.select().from(quotes).where(eq(quotes.createdBy, user.username));
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
  
  async updateQuoteFeature(quoteId: number, featureId: number, data: { quantity: number, price: number }): Promise<QuoteFeature | undefined> {
    // Find the quote feature by quoteId and featureId
    const [existingQuoteFeature] = await db.select()
      .from(quoteFeatures)
      .where(
        and(
          eq(quoteFeatures.quoteId, quoteId),
          eq(quoteFeatures.featureId, featureId)
        )
      );
      
    if (!existingQuoteFeature) return undefined;
    
    // Update the quote feature with new data
    const [updatedQuoteFeature] = await db.update(quoteFeatures)
      .set({
        quantity: data.quantity,
        price: data.price
      })
      .where(eq(quoteFeatures.id, existingQuoteFeature.id))
      .returning();
      
    return updatedQuoteFeature;
  }
  
  async updateQuotePage(quoteId: number, pageId: number, data: { quantity: number, price: number }): Promise<QuotePage | undefined> {
    // Find the quote page by quoteId and pageId
    const [existingQuotePage] = await db.select()
      .from(quotePages)
      .where(
        and(
          eq(quotePages.quoteId, quoteId),
          eq(quotePages.pageId, pageId)
        )
      );
      
    if (!existingQuotePage) return undefined;
    
    // Update the quote page with new data
    const [updatedQuotePage] = await db.update(quotePages)
      .set({
        quantity: data.quantity,
        price: data.price
      })
      .where(eq(quotePages.id, existingQuotePage.id))
      .returning();
      
    return updatedQuotePage;
  }
}