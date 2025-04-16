import { IDBAdapter } from './IDBAdapter';
import { PostgreSQLAdapter } from './PostgreSQLAdapter';
import { MySQLAdapter } from './MySQLAdapter';

/**
 * Database types supported by the application
 */
export type DatabaseType = 'postgres' | 'mysql';

/**
 * Interface for database configuration
 */
export interface DatabaseConfig {
  /**
   * Type of database (postgres or mysql)
   */
  type: DatabaseType;
  
  /**
   * Database host
   */
  host: string;
  
  /**
   * Database port
   */
  port: number;
  
  /**
   * Database name
   */
  database: string;
  
  /**
   * Database username
   */
  user: string;
  
  /**
   * Database password
   */
  password: string;
  
  /**
   * Whether to use SSL connection
   */
  ssl?: boolean;
}

/**
 * Factory for creating database adapters
 */
export class DBAdapterFactory {
  /**
   * Create a database adapter based on the database type
   * @param config Database configuration
   * @returns A database adapter instance
   */
  public static createAdapter(config: DatabaseConfig): IDBAdapter {
    switch (config.type) {
      case 'postgres':
        return new PostgreSQLAdapter(config);
      case 'mysql':
        return new MySQLAdapter(config);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }
}