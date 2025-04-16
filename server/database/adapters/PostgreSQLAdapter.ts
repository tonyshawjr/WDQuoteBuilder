import pg from 'pg';
const { Pool } = pg;
type PgPool = any; // Using any to resolve the typing issue
import { IDBAdapter } from './IDBAdapter';
import { DatabaseConfig } from './DBAdapterFactory';

/**
 * PostgreSQL database adapter
 * Implements the IDBAdapter interface for PostgreSQL
 */
export class PostgreSQLAdapter implements IDBAdapter {
  private pool: PgPool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    // Create a PostgreSQL connection pool
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined
    });
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    // Test the connection
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      console.error('PostgreSQL connection error:', error);
      throw new Error(`Failed to connect to PostgreSQL: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Execute a query on the database
   * @param query The SQL query to execute
   * @param params Optional parameters for the query
   * @returns The result of the query
   */
  async query<T = any>(query: string, params?: any[]): Promise<T[]> {
    try {
      const result = await this.pool.query(query, params);
      return result.rows as T[];
    } catch (error) {
      console.error('PostgreSQL query error:', error);
      throw new Error(`Query failed: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a query that returns a single result
   * @param query The SQL query to execute
   * @param params Optional parameters for the query
   * @returns The first result of the query, or null if no results
   */
  async queryOne<T = any>(query: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(query, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Test the connection to the database
   * @returns True if the connection is successful, false otherwise
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to connect to the database
      const client = await this.pool.connect();
      
      // Run a simple query to make sure the connection works
      await client.query('SELECT 1');
      
      // Release the connection
      client.release();
      
      return true;
    } catch (error) {
      console.error('PostgreSQL connection test failed:', error);
      return false;
    }
  }
}