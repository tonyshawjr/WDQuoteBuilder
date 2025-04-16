/**
 * Interface for database adapters
 * This provides a common interface for different database implementations
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
   * @param query SQL query to execute
   * @param params Parameters for the query
   */
  query<T = any>(query: string, params?: any[]): Promise<T[]>;
  
  /**
   * Execute a single query that returns one result
   * @param query SQL query to execute
   * @param params Parameters for the query
   */
  queryOne<T = any>(query: string, params?: any[]): Promise<T | null>;
  
  /**
   * Get the database client/connection
   */
  getClient(): any;
  
  /**
   * Test the database connection
   */
  testConnection(): Promise<boolean>;
}