import { IDBAdapter } from './adapters/IDBAdapter';
import { DBAdapterFactory, DatabaseConfig } from './adapters/DBAdapterFactory';

/**
 * Database service that uses the appropriate adapter based on configuration
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private adapter: IDBAdapter;
  private isConnected: boolean = false;

  private constructor(adapter: IDBAdapter) {
    this.adapter = adapter;
  }

  /**
   * Get the database service instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      const adapter = DBAdapterFactory.createAdapterFromEnv();
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
      console.log('Database connection established');
    }
  }

  /**
   * Disconnect from the database
   */
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.adapter.disconnect();
      this.isConnected = false;
      console.log('Database connection closed');
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
    try {
      return await this.adapter.testConnection();
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get the database adapter
   */
  public getAdapter(): IDBAdapter {
    return this.adapter;
  }
}