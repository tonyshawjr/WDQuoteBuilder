import { IDBAdapter } from './adapters/IDBAdapter';
import { DBAdapterFactory, DatabaseConfig } from './adapters/DBAdapterFactory';
import { ConfigManager } from '../config/ConfigManager';

/**
 * Database service that uses the appropriate adapter based on configuration
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private adapter: IDBAdapter;
  private isConnected: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(adapter: IDBAdapter) {
    this.adapter = adapter;
  }

  /**
   * Get the database service instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      // Get configuration from config manager
      const configManager = ConfigManager.getInstance();
      const dbConfig = configManager.getDatabaseConfig();
      
      // Create the appropriate adapter
      const adapter = DBAdapterFactory.createAdapter(dbConfig);
      
      // Create a new instance with the adapter
      DatabaseService.instance = new DatabaseService(adapter);
    }
    
    return DatabaseService.instance;
  }

  /**
   * Initialize with a specific adapter
   */
  public static initWithAdapter(adapter: IDBAdapter): DatabaseService {
    DatabaseService.instance = new DatabaseService(adapter);
    return DatabaseService.instance;
  }

  /**
   * Initialize with a database configuration
   */
  public static initWithConfig(config: DatabaseConfig): DatabaseService {
    const adapter = DBAdapterFactory.createAdapter(config);
    DatabaseService.instance = new DatabaseService(adapter);
    return DatabaseService.instance;
  }

  /**
   * Connect to the database
   */
  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.adapter.connect();
      this.isConnected = true;
    }
  }

  /**
   * Disconnect from the database
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.adapter.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Execute a query on the database
   */
  public async query<T = any>(query: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    return this.adapter.query<T>(query, params);
  }

  /**
   * Execute a single query that returns one result
   */
  public async queryOne<T = any>(query: string, params?: any[]): Promise<T | null> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    return this.adapter.queryOne<T>(query, params);
  }

  /**
   * Test the database connection
   */
  public async testConnection(): Promise<boolean> {
    return this.adapter.testConnection();
  }

  /**
   * Get the database adapter
   */
  public getAdapter(): IDBAdapter {
    return this.adapter;
  }
}