import fs from 'fs';
import path from 'path';
import { DatabaseConfig } from '../database/adapters/DBAdapterFactory';

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
  private config: AppConfig;
  private configPath: string;

  private defaultConfig: AppConfig = {
    database: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'webdesignquotebuilder',
      user: 'postgres',
      password: 'postgres',
      ssl: false
    },
    appName: 'Web Design Quote Builder',
    isInstalled: false,
    version: '1.0.0'
  };

  private constructor(configPath: string) {
    this.configPath = configPath;
    this.loadConfig();
  }

  /**
   * Get the configuration manager instance
   */
  public static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      const configFilePath = configPath || path.join(process.cwd(), 'app-config.json');
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
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(configData);
      } else {
        this.config = { ...this.defaultConfig };
        this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      this.config = { ...this.defaultConfig };
      this.saveConfig();
    }
  }

  /**
   * Save the configuration to the file
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }
}