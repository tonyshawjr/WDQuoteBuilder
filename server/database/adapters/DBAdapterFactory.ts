import { IDBAdapter } from './IDBAdapter';
import { PostgreSQLAdapter, PostgreSQLConfig } from './PostgreSQLAdapter';
import { MySQLAdapter, MySQLConfig } from './MySQLAdapter';

export type DatabaseType = 'postgres' | 'mysql';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export class DBAdapterFactory {
  /**
   * Create a database adapter based on the database type
   */
  static createAdapter(config: DatabaseConfig): IDBAdapter {
    switch (config.type) {
      case 'postgres':
        return new PostgreSQLAdapter(config as PostgreSQLConfig);
      case 'mysql':
        return new MySQLAdapter(config as MySQLConfig);
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
  }

  /**
   * Create a database adapter from environment variables
   */
  static createAdapterFromEnv(): IDBAdapter {
    const type = process.env.DB_TYPE as DatabaseType || 'postgres';
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432');
    const database = process.env.DB_NAME || '';
    const user = process.env.DB_USER || '';
    const password = process.env.DB_PASSWORD || '';
    const ssl = process.env.DB_SSL === 'true';

    return this.createAdapter({
      type,
      host,
      port,
      database,
      user,
      password,
      ssl
    });
  }
}