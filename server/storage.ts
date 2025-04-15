import { 
  users, type User, type InsertUser,
  projectTypes, type ProjectType, type InsertProjectType,
  features, type Feature, type InsertFeature,
  pages, type Page, type InsertPage
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project type operations
  getProjectTypes(): Promise<ProjectType[]>;
  getProjectType(id: number): Promise<ProjectType | undefined>;
  createProjectType(projectType: InsertProjectType): Promise<ProjectType>;
  updateProjectType(id: number, projectType: InsertProjectType): Promise<ProjectType | undefined>;
  deleteProjectType(id: number): Promise<boolean>;
  
  // Feature operations
  getFeatures(): Promise<Feature[]>;
  getFeaturesByProjectType(projectTypeId: number): Promise<Feature[]>;
  getFeature(id: number): Promise<Feature | undefined>;
  createFeature(feature: InsertFeature): Promise<Feature>;
  updateFeature(id: number, feature: InsertFeature): Promise<Feature | undefined>;
  deleteFeature(id: number): Promise<boolean>;
  
  // Page operations
  getPages(): Promise<Page[]>;
  getPagesByProjectType(projectTypeId: number): Promise<Page[]>;
  getPage(id: number): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: number, page: InsertPage): Promise<Page | undefined>;
  deletePage(id: number): Promise<boolean>;
  getActivePagesOnly(): Promise<Page[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projectTypesMap: Map<number, ProjectType>;
  private featuresMap: Map<number, Feature>;
  private pagesMap: Map<number, Page>;
  userCurrentId: number;
  projectTypeCurrentId: number;
  featureCurrentId: number;
  pageCurrentId: number;

  constructor() {
    this.users = new Map();
    this.projectTypesMap = new Map();
    this.featuresMap = new Map();
    this.pagesMap = new Map();
    this.userCurrentId = 1;
    this.projectTypeCurrentId = 1;
    this.featureCurrentId = 1;
    this.pageCurrentId = 1;
    
    // Initialize with admin user
    this.createUser({
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      isAdmin: true,
    });
    
    // Initialize with regular user
    this.createUser({
      username: "sales",
      password: "sales123", // In a real app, this would be hashed
      isAdmin: false,
    });
    
    // Initialize with some project types
    this.createInitialData();
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Project type operations
  async getProjectTypes(): Promise<ProjectType[]> {
    return Array.from(this.projectTypesMap.values());
  }
  
  async getProjectType(id: number): Promise<ProjectType | undefined> {
    return this.projectTypesMap.get(id);
  }
  
  async createProjectType(projectType: InsertProjectType): Promise<ProjectType> {
    const id = this.projectTypeCurrentId++;
    const newProjectType: ProjectType = { ...projectType, id };
    this.projectTypesMap.set(id, newProjectType);
    return newProjectType;
  }
  
  async updateProjectType(id: number, projectType: InsertProjectType): Promise<ProjectType | undefined> {
    const existingProjectType = this.projectTypesMap.get(id);
    if (!existingProjectType) return undefined;
    
    const updatedProjectType: ProjectType = { ...projectType, id };
    this.projectTypesMap.set(id, updatedProjectType);
    return updatedProjectType;
  }
  
  async deleteProjectType(id: number): Promise<boolean> {
    return this.projectTypesMap.delete(id);
  }
  
  // Feature operations
  async getFeatures(): Promise<Feature[]> {
    return Array.from(this.featuresMap.values());
  }
  
  async getFeaturesByProjectType(projectTypeId: number): Promise<Feature[]> {
    return Array.from(this.featuresMap.values()).filter(
      feature => feature.projectTypeId === projectTypeId
    );
  }
  
  async getFeature(id: number): Promise<Feature | undefined> {
    return this.featuresMap.get(id);
  }
  
  async createFeature(feature: InsertFeature): Promise<Feature> {
    const id = this.featureCurrentId++;
    const newFeature: Feature = { ...feature, id };
    this.featuresMap.set(id, newFeature);
    return newFeature;
  }
  
  async updateFeature(id: number, feature: InsertFeature): Promise<Feature | undefined> {
    const existingFeature = this.featuresMap.get(id);
    if (!existingFeature) return undefined;
    
    const updatedFeature: Feature = { ...feature, id };
    this.featuresMap.set(id, updatedFeature);
    return updatedFeature;
  }
  
  async deleteFeature(id: number): Promise<boolean> {
    return this.featuresMap.delete(id);
  }
  
  // Page operations
  async getPages(): Promise<Page[]> {
    return Array.from(this.pagesMap.values());
  }
  
  async getActivePagesOnly(): Promise<Page[]> {
    return Array.from(this.pagesMap.values()).filter(
      page => page.isActive
    );
  }
  
  async getPagesByProjectType(projectTypeId: number): Promise<Page[]> {
    return Array.from(this.pagesMap.values()).filter(
      page => page.projectTypeId === projectTypeId
    );
  }
  
  async getPage(id: number): Promise<Page | undefined> {
    return this.pagesMap.get(id);
  }
  
  async createPage(page: InsertPage): Promise<Page> {
    const id = this.pageCurrentId++;
    const newPage: Page = { ...page, id };
    this.pagesMap.set(id, newPage);
    return newPage;
  }
  
  async updatePage(id: number, page: InsertPage): Promise<Page | undefined> {
    const existingPage = this.pagesMap.get(id);
    if (!existingPage) return undefined;
    
    const updatedPage: Page = { ...page, id };
    this.pagesMap.set(id, updatedPage);
    return updatedPage;
  }
  
  async deletePage(id: number): Promise<boolean> {
    return this.pagesMap.delete(id);
  }
  
  // Initialize with sample data
  private async createInitialData() {
    // Create project types
    const wordpressType = await this.createProjectType({
      name: "WordPress Website",
      basePrice: 2500,
    });
    
    const shopifyType = await this.createProjectType({
      name: "Shopify Store",
      basePrice: 3200,
    });
    
    const brandingType = await this.createProjectType({
      name: "Branding Package",
      basePrice: 1800,
    });
    
    // Create WordPress features
    await this.createFeature({
      projectTypeId: wordpressType.id,
      name: "Custom Design",
      description: "Custom design for your website based on your brand guidelines",
      category: "Design",
      pricingType: "hourly",
      hourlyRate: 150,
      estimatedHours: 15,
      flatPrice: null,
      supportsQuantity: true,
    });
    
    await this.createFeature({
      projectTypeId: wordpressType.id,
      name: "Responsive Design",
      description: "Ensure your website looks great on all devices",
      category: "Design",
      pricingType: "fixed",
      flatPrice: 800,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    });
    
    await this.createFeature({
      projectTypeId: wordpressType.id,
      name: "Contact Form",
      description: "Custom contact form with email notifications",
      category: "Functionality",
      pricingType: "fixed",
      flatPrice: 350,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    });
    
    await this.createFeature({
      projectTypeId: wordpressType.id,
      name: "Design Revisions",
      description: "Includes up to 3 rounds of design revisions",
      category: "Design",
      pricingType: "fixed",
      flatPrice: 1500,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    });
    
    await this.createFeature({
      projectTypeId: wordpressType.id,
      name: "Blog Setup",
      description: "Blog with categories, tags, and comment system",
      category: "Functionality",
      pricingType: "fixed",
      flatPrice: 600,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    });
    
    await this.createFeature({
      projectTypeId: wordpressType.id,
      name: "Basic SEO Setup",
      description: "SEO optimization for better search engine rankings",
      category: "Functionality",
      pricingType: "fixed",
      flatPrice: 500,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    });
    
    await this.createFeature({
      projectTypeId: wordpressType.id,
      name: "Content Upload",
      description: "We'll upload your content into the website",
      category: "Content",
      pricingType: "hourly",
      hourlyRate: 85,
      estimatedHours: 15,
      flatPrice: null,
      supportsQuantity: true,
    });
    
    // Create Shopify features
    await this.createFeature({
      projectTypeId: shopifyType.id,
      name: "Theme Customization",
      description: "Customize a Shopify theme to match your brand",
      category: "Design",
      pricingType: "hourly",
      hourlyRate: 150,
      estimatedHours: 10,
      flatPrice: null,
      supportsQuantity: false,
    });
    
    await this.createFeature({
      projectTypeId: shopifyType.id,
      name: "Product Upload",
      description: "Upload and configure products in your store",
      category: "Data Entry",
      pricingType: "hourly",
      hourlyRate: 85,
      estimatedHours: 8,
      flatPrice: null,
      supportsQuantity: true,
    });
    
    // Create Branding features
    await this.createFeature({
      projectTypeId: brandingType.id,
      name: "Logo Design",
      description: "Professional logo design with multiple concepts",
      category: "Branding",
      pricingType: "fixed",
      flatPrice: 1200,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    });
    
    await this.createFeature({
      projectTypeId: brandingType.id,
      name: "Business Card Design",
      description: "Custom business card design",
      category: "Branding",
      pricingType: "fixed",
      flatPrice: 300,
      hourlyRate: null,
      estimatedHours: null,
      supportsQuantity: false,
    });
    
    // Create sample pages
    await this.createPage({
      name: "Home Page",
      description: "Main landing page of the website",
      pricePerPage: 350,
      defaultQuantity: 1,
      isActive: true,
      projectTypeId: wordpressType.id,
    });
    
    await this.createPage({
      name: "About Us",
      description: "Company information and history page",
      pricePerPage: 250,
      defaultQuantity: 1,
      isActive: true,
      projectTypeId: wordpressType.id,
    });
    
    await this.createPage({
      name: "Services",
      description: "Detailed list of services offered",
      pricePerPage: 300,
      defaultQuantity: 1,
      isActive: true,
      projectTypeId: wordpressType.id,
    });
    
    await this.createPage({
      name: "Contact",
      description: "Contact information and form",
      pricePerPage: 200,
      defaultQuantity: 1,
      isActive: true,
      projectTypeId: wordpressType.id,
    });
    
    await this.createPage({
      name: "Blog",
      description: "Blog landing page with excerpts of recent posts",
      pricePerPage: 275,
      defaultQuantity: 1,
      isActive: true,
      projectTypeId: wordpressType.id,
    });
    
    await this.createPage({
      name: "Product Page",
      description: "Individual product page template",
      pricePerPage: 175,
      defaultQuantity: 5,
      isActive: true,
      projectTypeId: shopifyType.id,
    });
    
    await this.createPage({
      name: "Category Page",
      description: "Product category listing page",
      pricePerPage: 225,
      defaultQuantity: 3,
      isActive: true,
      projectTypeId: shopifyType.id,
    });
    
    await this.createPage({
      name: "Cart & Checkout",
      description: "Shopping cart and checkout process pages",
      pricePerPage: 400,
      defaultQuantity: 1,
      isActive: true,
      projectTypeId: shopifyType.id,
    });
  }
}

export const storage = new MemStorage();
