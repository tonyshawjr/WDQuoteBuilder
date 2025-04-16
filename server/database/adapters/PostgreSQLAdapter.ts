import { Pool, PoolClient } from 'pg';
import { IDBAdapter } from './IDBAdapter';

export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export class PostgreSQLAdapter implements IDBAdapter {
  private pool: Pool;
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined
    });
  }

  async connect(): Promise<void> {
    // The pool automatically manages connections
    // Just try a test connection to ensure it's working
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      console.error('PostgreSQL connection error:', error);
      throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async query<T = any>(query: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async queryOne<T = any>(query: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(query, params);
    return results.length > 0 ? results[0] : null;
  }

  getClient(): Pool {
    return this.pool;
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('PostgreSQL connection test failed:', error);
      return false;
    }
  }
}