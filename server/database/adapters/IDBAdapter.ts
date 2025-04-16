/**
 * Interface for database adapters
 * This ensures consistent implementation regardless of the database type
 */
export interface IDBAdapter {
  /**
   * Connect to the database
   */
  connect(): Promise<void>;
  
  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;
  
  /**
   * Execute a query on the database
   * @param query The SQL query to execute
   * @param params Optional parameters for the query
   * @returns The result of the query
   */
  query<T = any>(query: string, params?: any[]): Promise<T[]>;
  
  /**
   * Execute a query that returns a single result
   * @param query The SQL query to execute
   * @param params Optional parameters for the query
   * @returns The first result of the query, or null if no results
   */
  queryOne<T = any>(query: string, params?: any[]): Promise<T | null>;
  
  /**
   * Test the connection to the database
   * @returns True if the connection is successful, false otherwise
   */
  testConnection(): Promise<boolean>;
}