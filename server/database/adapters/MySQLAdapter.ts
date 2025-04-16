import mysql from 'mysql2/promise';
import { IDBAdapter } from './IDBAdapter';

export interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export class MySQLAdapter implements IDBAdapter {
  private pool: mysql.Pool;
  private config: MySQLConfig;

  constructor(config: MySQLConfig) {
    this.config = config;
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      // Convert MySQL boolean to JS boolean
      typeCast: function (field, next) {
        if (field.type === 'TINY' && field.length === 1) {
          return (field.string() === '1'); // 1 = true, 0 = false
        }
        return next();
      }
    });
  }

  async connect(): Promise<void> {
    // The pool automatically manages connections
    // Just try a test connection to ensure it's working
    try {
      const connection = await this.pool.getConnection();
      connection.release();
    } catch (error) {
      console.error('MySQL connection error:', error);
      throw new Error(`Failed to connect to MySQL: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async query<T = any>(query: string, params?: any[]): Promise<T[]> {
    // MySQL queries use ? for parameters instead of $1, $2, etc.
    // Convert PostgreSQL style parameters to MySQL style if needed
    const convertedQuery = this.convertQuery(query);
    
    try {
      const [rows] = await this.pool.execute(convertedQuery, params);
      return rows as T[];
    } catch (error) {
      console.error('MySQL query error:', error);
      throw new Error(`MySQL query failed: ${error.message}`);
    }
  }

  async queryOne<T = any>(query: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(query, params);
    return results.length > 0 ? results[0] : null;
  }

  getClient(): mysql.Pool {
    return this.pool;
  }

  async testConnection(): Promise<boolean> {
    try {
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1');
      connection.release();
      return true;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert PostgreSQL style parameters ($1, $2) to MySQL style (?)
   */
  private convertQuery(query: string): string {
    // If query uses PostgreSQL style parameters ($1, $2, etc), convert to MySQL style (?)
    if (query.includes('$')) {
      // Match all $n parameters
      const parameterRegex = /\$(\d+)/g;
      const parameters: number[] = [];
      
      // Extract all parameter numbers and find the highest
      let match;
      while ((match = parameterRegex.exec(query)) !== null) {
        parameters.push(parseInt(match[1]));
      }
      
      // Replace each $n parameter with ?
      let convertedQuery = query;
      for (let i = 1; i <= Math.max(...parameters); i++) {
        convertedQuery = convertedQuery.replace(new RegExp(`\\$${i}`, 'g'), '?');
      }
      
      return convertedQuery;
    }
    
    return query;
  }
}