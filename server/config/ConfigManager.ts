import fs from 'fs';
import path from 'path';
import { DatabaseConfig } from '../database/adapters/DBAdapterFactory';

/**
 * Interface for the application configuration
 */
interface AppConfig {
  database: DatabaseConfig;
  appName: string;
  isInstalled: boolean;
  installDate?: string;
  version: string;
}

/**
 * Manages application configuration
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config!: AppConfig; // Initialize in constructor
  private configPath: string;

  private defaultConfig: AppConfig = {
    database: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'web_design_calculator',
      user: 'postgres',
      password: '',
      ssl: false
    },
    appName: 'Web Design Price Calculator',
    isInstalled: false,
    version: '1.0.0'
  };

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(configPath: string) {
    this.configPath = configPath;
    this.loadConfig();
  }

  /**
   * Get the configuration manager instance
   */
  public static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      const configFilePath = configPath || path.join(process.cwd(), 'config.json');
      ConfigManager.instance = new ConfigManager(configFilePath);
    }
    return ConfigManager.instance;
  }

  /**
   * Check if the application is installed
   */
  public isInstalled(): boolean {
    return this.config.isInstalled;
  }

  /**
   * Get the database configuration
   */
  public getDatabaseConfig(): DatabaseConfig {
    return this.config.database;
  }

  /**
   * Get the application name
   */
  public getAppName(): string {
    return this.config.appName;
  }

  /**
   * Get the application version
   */
  public getVersion(): string {
    return this.config.version;
  }

  /**
   * Update the database configuration
   */
  public updateDatabaseConfig(dbConfig: DatabaseConfig): void {
    this.config.database = dbConfig;
    this.saveConfig();
  }

  /**
   * Set the application as installed
   */
  public setInstalled(installed: boolean): void {
    this.config.isInstalled = installed;
    if (installed) {
      this.config.installDate = new Date().toISOString();
    }
    this.saveConfig();
  }

  /**
   * Update the application name
   */
  public updateAppName(appName: string): void {
    this.config.appName = appName;
    this.saveConfig();
  }

  /**
   * Load the configuration from the file
   */
  private loadConfig(): void {
    try {
      // Check if the config file exists
      if (fs.existsSync(this.configPath)) {
        // Read and parse the config file
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        // Use default configuration and save it
        this.config = { ...this.defaultConfig };
        this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Use default configuration in case of error
      this.config = { ...this.defaultConfig };
    }
  }

  /**
   * Save the configuration to the file
   */
  private saveConfig(): void {
    try {
      // Create the directory if it doesn't exist
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Write the config to the file
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }
}