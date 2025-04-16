import mysql from 'mysql2/promise';
import { IDBAdapter } from './IDBAdapter';
import { DatabaseConfig } from './DBAdapterFactory';

/**
 * MySQL database adapter
 * Implements the IDBAdapter interface for MySQL
 */
export class MySQLAdapter implements IDBAdapter {
  private pool: mysql.Pool;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    
    // Create a MySQL connection pool
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    // Test the connection
    try {
      const connection = await this.pool.getConnection();
      connection.release();
    } catch (error) {
      console.error('MySQL connection error:', error);
      throw new Error(`Failed to connect to MySQL: ${(error as Error).message}`);
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
      const [rows] = await this.pool.query(query, params || []);
      return rows as T[];
    } catch (error) {
      console.error('MySQL query error:', error);
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
      const connection = await this.pool.getConnection();
      
      // Run a simple query to make sure the connection works
      await connection.query('SELECT 1');
      
      // Release the connection
      connection.release();
      
      return true;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }
}