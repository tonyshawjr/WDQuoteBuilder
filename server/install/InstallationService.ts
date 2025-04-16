import { DatabaseService } from '../database/DatabaseService';
import { ConfigManager } from '../config/ConfigManager';
import { DatabaseConfig, DatabaseType } from '../database/adapters/DBAdapterFactory';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Define admin user for database creation
export interface AdminUser {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Define installation settings
export interface InstallationSettings {
  databaseConfig: DatabaseConfig;
  adminUser: AdminUser;
  businessName: string;
  includeDemoData: boolean;
}

/**
 * Service for handling application installation
 */
export class InstallationService {
  private dbService: DatabaseService;
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * Check if the application is installed
   */
  public isInstalled(): boolean {
    return this.configManager.isInstalled();
  }

  /**
   * Test the database connection with the provided configuration
   */
  public async testDatabaseConnection(dbConfig: DatabaseConfig): Promise<boolean> {
    // Create a new database service with the provided configuration
    const tempDbService = DatabaseService.initWithConfig(dbConfig);
    
    try {
      return await tempDbService.testConnection();
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Install the application
   */
  public async installApplication(settings: InstallationSettings): Promise<boolean> {
    try {
      // First test the database connection
      const connectionSuccessful = await this.testDatabaseConnection(settings.databaseConfig);
      if (!connectionSuccessful) {
        throw new Error('Database connection failed');
      }

      // Set up the database service with the provided configuration
      const dbService = DatabaseService.initWithConfig(settings.databaseConfig);
      
      // Create database schema
      await this.createDatabaseSchema(dbService, settings.databaseConfig.type);
      
      // Create admin user
      await this.createAdminUser(dbService, settings.adminUser);
      
      // Set business name
      await this.setBusinessName(dbService, settings.businessName);
      
      // Add demo data if requested
      if (settings.includeDemoData) {
        await this.addDemoData(dbService, settings.databaseConfig.type);
      }
      
      // Update configuration
      this.configManager.updateDatabaseConfig(settings.databaseConfig);
      this.configManager.setInstalled(true);
      
      return true;
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  }

  /**
   * Create database schema for the application
   */
  private async createDatabaseSchema(dbService: DatabaseService, dbType: DatabaseType): Promise<void> {
    try {
      // First check if tables already exist by checking for users table
      const dbConfig = this.configManager.getDatabaseConfig();
      const checkResult = await dbService.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = '${dbType === 'mysql' ? dbConfig.database : 'public'}'
        AND table_name = 'users'
      `);
      
      // If users table already exists, skip schema creation
      if (checkResult && checkResult.length > 0) {
        console.log('Database tables already exist, skipping schema creation');
        return;
      }
      
      // Create tables based on database type
      const createTablesQueries = this.getCreateTablesQueries(dbType);
      
      for (const query of createTablesQueries) {
        await dbService.query(query);
      }
    } catch (error) {
      console.error('Error checking or creating database schema:', error);
      throw error;
    }
  }

  /**
   * Create admin user
   */
  private async createAdminUser(dbService: DatabaseService, adminUser: AdminUser): Promise<void> {
    try {
      // Check if admin user already exists
      const existingUser = await dbService.queryOne(
        'SELECT COUNT(*) as count FROM users WHERE username = ? OR email = ?',
        [adminUser.username, adminUser.email]
      );
      
      if (existingUser && existingUser.count > 0) {
        console.log('Admin user already exists, skipping creation');
        return;
      }
      
      // Hash the password
      const hashedPassword = await this.hashPassword(adminUser.password);
      
      // Insert the admin user
      await dbService.query(
        'INSERT INTO users (username, password, email, firstName, lastName, isAdmin) VALUES (?, ?, ?, ?, ?, ?)',
        [adminUser.username, hashedPassword, adminUser.email, adminUser.firstName, adminUser.lastName, true]
      );
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  /**
   * Set business name
   */
  private async setBusinessName(dbService: DatabaseService, businessName: string): Promise<void> {
    // Check if system_settings table exists
    const settingsExists = await dbService.queryOne('SELECT COUNT(*) as count FROM system_settings');
    
    if (settingsExists && settingsExists.count > 0) {
      // Update existing settings
      await dbService.query(
        'UPDATE system_settings SET businessName = ?',
        [businessName]
      );
    } else {
      // Insert new settings
      await dbService.query(
        'INSERT INTO system_settings (businessName, lightModeColor, darkModeColor) VALUES (?, ?, ?)',
        [businessName, '#F9B200', '#F9B200']
      );
    }
  }

  /**
   * Add demo data to the database
   */
  private async addDemoData(dbService: DatabaseService, dbType: DatabaseType): Promise<void> {
    try {
      // Check if data already exists in project_types table
      const projectTypesExist = await dbService.queryOne('SELECT COUNT(*) as count FROM project_types');
      
      if (projectTypesExist && projectTypesExist.count > 0) {
        console.log('Demo data already exists, skipping demo data creation');
        return;
      }
      
      // Add project types
      await dbService.query(
        'INSERT INTO project_types (name, basePrice, description) VALUES (?, ?, ?)',
        ['New Website', 1000, 'Brand new website development']
      );
      
      await dbService.query(
        'INSERT INTO project_types (name, basePrice, description) VALUES (?, ?, ?)',
        ['Existing Website Redesign', 750, 'Redesign of an existing website']
      );
      
      // Add pages
      await dbService.query(
        'INSERT INTO pages (name, description, pricePerPage, defaultQuantity, supportsQuantity, isActive) VALUES (?, ?, ?, ?, ?, ?)',
        ['Home Page', 'Main landing page', 250, 1, false, true]
      );
      
      await dbService.query(
        'INSERT INTO pages (name, description, pricePerPage, defaultQuantity, supportsQuantity, isActive) VALUES (?, ?, ?, ?, ?, ?)',
        ['Standard Page', 'Regular content page', 200, 1, true, true]
      );
      
      // Add features
      await dbService.query(
        'INSERT INTO features (name, description, pricingType, flatPrice, category, supportsQuantity, forAllProjectTypes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Custom Design', 'Unique design tailored to your brand', 'flat', 500, 'Design', false, true]
      );
      
      await dbService.query(
        'INSERT INTO features (name, description, pricingType, flatPrice, category, supportsQuantity, forAllProjectTypes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Contact Form', 'Form for visitors to reach you', 'flat', 150, 'Functionality', true, true]
      );
      
      await dbService.query(
        'INSERT INTO features (name, description, pricingType, hourlyRate, estimatedHours, category, supportsQuantity, forAllProjectTypes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['Custom Development', 'Custom programming for specific needs', 'hourly', 75, 10, 'Development', true, true]
      );
    } catch (error) {
      console.error('Error adding demo data:', error);
      throw error;
    }
  }

  /**
   * Hash a password for secure storage
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }

  /**
   * Get SQL queries for creating database tables based on database type
   */
  private getCreateTablesQueries(dbType: DatabaseType): string[] {
    if (dbType === 'mysql') {
      return this.getMySQLCreateTablesQueries();
    } else {
      return this.getPostgreSQLCreateTablesQueries();
    }
  }

  /**
   * Get MySQL queries for creating database tables
   */
  private getMySQLCreateTablesQueries(): string[] {
    return [
      // System settings table
      `CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        businessName VARCHAR(255) NULL DEFAULT NULL,
        lightModeColor VARCHAR(50) NULL DEFAULT '#F9B200',
        darkModeColor VARCHAR(50) NULL DEFAULT '#F9B200'
      )`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL DEFAULT NULL,
        firstName VARCHAR(255) NULL DEFAULT NULL,
        lastName VARCHAR(255) NULL DEFAULT NULL,
        isAdmin BOOLEAN NOT NULL DEFAULT FALSE
      )`,
      
      // Project types table
      `CREATE TABLE IF NOT EXISTS project_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        basePrice DECIMAL(10, 2) NOT NULL DEFAULT 0,
        description TEXT NULL DEFAULT NULL
      )`,
      
      // Features table
      `CREATE TABLE IF NOT EXISTS features (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectTypeId INT NULL DEFAULT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL DEFAULT NULL,
        category VARCHAR(255) NULL DEFAULT NULL,
        pricingType VARCHAR(50) NOT NULL,
        flatPrice DECIMAL(10, 2) NULL DEFAULT NULL,
        hourlyRate DECIMAL(10, 2) NULL DEFAULT NULL,
        estimatedHours DECIMAL(5, 2) NULL DEFAULT NULL,
        supportsQuantity BOOLEAN NULL DEFAULT FALSE,
        forAllProjectTypes BOOLEAN NULL DEFAULT FALSE,
        FOREIGN KEY (projectTypeId) REFERENCES project_types(id) ON DELETE SET NULL
      )`,
      
      // Feature project types table
      `CREATE TABLE IF NOT EXISTS feature_project_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        featureId INT NOT NULL,
        projectTypeId INT NOT NULL,
        FOREIGN KEY (featureId) REFERENCES features(id) ON DELETE CASCADE,
        FOREIGN KEY (projectTypeId) REFERENCES project_types(id) ON DELETE CASCADE,
        UNIQUE(featureId, projectTypeId)
      )`,
      
      // Pages table
      `CREATE TABLE IF NOT EXISTS pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectTypeId INT NULL DEFAULT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL DEFAULT NULL,
        supportsQuantity BOOLEAN NOT NULL DEFAULT TRUE,
        pricePerPage DECIMAL(10, 2) NOT NULL DEFAULT 0,
        defaultQuantity INT NULL DEFAULT 1,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        FOREIGN KEY (projectTypeId) REFERENCES project_types(id) ON DELETE SET NULL
      )`,
      
      // Quotes table
      `CREATE TABLE IF NOT EXISTS quotes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectTypeId INT NULL DEFAULT NULL,
        email VARCHAR(255) NOT NULL,
        clientName VARCHAR(255) NOT NULL,
        businessName VARCHAR(255) NULL DEFAULT NULL,
        phone VARCHAR(50) NULL DEFAULT NULL,
        notes TEXT NULL DEFAULT NULL,
        internalNotes TEXT NULL DEFAULT NULL,
        leadStatus VARCHAR(50) NULL DEFAULT 'New',
        totalPrice DECIMAL(10, 2) NOT NULL DEFAULT 0,
        closed BOOLEAN NOT NULL DEFAULT FALSE,
        closeDate DATETIME NULL DEFAULT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        createdBy VARCHAR(255) NULL DEFAULT NULL,
        updatedBy VARCHAR(255) NULL DEFAULT NULL,
        FOREIGN KEY (projectTypeId) REFERENCES project_types(id) ON DELETE SET NULL
      )`,
      
      // Quote features table
      `CREATE TABLE IF NOT EXISTS quote_features (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quoteId INT NOT NULL,
        featureId INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE CASCADE,
        FOREIGN KEY (featureId) REFERENCES features(id) ON DELETE CASCADE
      )`,
      
      // Quote pages table
      `CREATE TABLE IF NOT EXISTS quote_pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        quoteId INT NOT NULL,
        pageId INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0,
        FOREIGN KEY (quoteId) REFERENCES quotes(id) ON DELETE CASCADE,
        FOREIGN KEY (pageId) REFERENCES pages(id) ON DELETE CASCADE
      )`
    ];
  }

  /**
   * Get PostgreSQL queries for creating database tables
   */
  private getPostgreSQLCreateTablesQueries(): string[] {
    return [
      // System settings table
      `CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        "businessName" TEXT DEFAULT NULL,
        "lightModeColor" TEXT DEFAULT '#F9B200',
        "darkModeColor" TEXT DEFAULT '#F9B200'
      )`,
      
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT DEFAULT NULL,
        "firstName" TEXT DEFAULT NULL,
        "lastName" TEXT DEFAULT NULL,
        "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE
      )`,
      
      // Project types table
      `CREATE TABLE IF NOT EXISTS project_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        "basePrice" DECIMAL NOT NULL DEFAULT 0,
        description TEXT DEFAULT NULL
      )`,
      
      // Features table
      `CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        "projectTypeId" INTEGER REFERENCES project_types(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        category TEXT DEFAULT NULL,
        "pricingType" TEXT NOT NULL,
        "flatPrice" DECIMAL DEFAULT NULL,
        "hourlyRate" DECIMAL DEFAULT NULL,
        "estimatedHours" DECIMAL DEFAULT NULL,
        "supportsQuantity" BOOLEAN DEFAULT FALSE,
        "forAllProjectTypes" BOOLEAN DEFAULT FALSE
      )`,
      
      // Feature project types table
      `CREATE TABLE IF NOT EXISTS feature_project_types (
        id SERIAL PRIMARY KEY,
        "featureId" INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        "projectTypeId" INTEGER NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
        UNIQUE("featureId", "projectTypeId")
      )`,
      
      // Pages table
      `CREATE TABLE IF NOT EXISTS pages (
        id SERIAL PRIMARY KEY,
        "projectTypeId" INTEGER REFERENCES project_types(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT NULL,
        "supportsQuantity" BOOLEAN NOT NULL DEFAULT TRUE,
        "pricePerPage" DECIMAL NOT NULL DEFAULT 0,
        "defaultQuantity" INTEGER DEFAULT 1,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE
      )`,
      
      // Quotes table
      `CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        "projectTypeId" INTEGER REFERENCES project_types(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        "clientName" TEXT NOT NULL,
        "businessName" TEXT DEFAULT NULL,
        phone TEXT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        "internalNotes" TEXT DEFAULT NULL,
        "leadStatus" TEXT DEFAULT 'New',
        "totalPrice" DECIMAL NOT NULL DEFAULT 0,
        closed BOOLEAN NOT NULL DEFAULT FALSE,
        "closeDate" TIMESTAMP DEFAULT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdBy" TEXT DEFAULT NULL,
        "updatedBy" TEXT DEFAULT NULL
      )`,
      
      // Quote features table
      `CREATE TABLE IF NOT EXISTS quote_features (
        id SERIAL PRIMARY KEY,
        "quoteId" INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        "featureId" INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        price DECIMAL NOT NULL DEFAULT 0
      )`,
      
      // Quote pages table
      `CREATE TABLE IF NOT EXISTS quote_pages (
        id SERIAL PRIMARY KEY,
        "quoteId" INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        "pageId" INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        price DECIMAL NOT NULL DEFAULT 0
      )`
    ];
  }
}