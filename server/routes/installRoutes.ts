import { Router, Request, Response } from 'express';
import { InstallationService, InstallationSettings, AdminUser } from '../install/InstallationService';
import { DatabaseConfig, DatabaseType } from '../database/adapters/DBAdapterFactory';
import { z } from 'zod';
import { exec } from 'child_process';

// Create a router
const router = Router();
const installationService = new InstallationService();

// Validation schemas
const databaseConfigSchema = z.object({
  type: z.enum(['postgres', 'mysql']),
  host: z.string().min(1),
  port: z.number().int().positive(),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string(),
  ssl: z.boolean().optional().default(false)
});

const adminUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

const installationSettingsSchema = z.object({
  databaseConfig: databaseConfigSchema,
  adminUser: adminUserSchema,
  businessName: z.string().min(1),
  includeDemoData: z.boolean().default(true)
});

// Check installation status
router.get('/status', (req: Request, res: Response) => {
  const isInstalled = installationService.isInstalled();
  res.json({ isInstalled });
});

// Test database connection
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    // Validate database configuration
    const validationResult = databaseConfigSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid database configuration', 
        errors: validationResult.error.errors 
      });
    }
    
    // Test the connection
    const connectionSuccessful = await installationService.testDatabaseConnection(validationResult.data);
    
    if (connectionSuccessful) {
      res.json({ success: true, message: 'Connection successful' });
    } else {
      res.status(400).json({ success: false, message: 'Database connection failed' });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while testing the database connection',
      error: errorMessage
    });
  }
});

// Install the application
router.post('/install', async (req: Request, res: Response) => {
  try {
    // Check if already installed
    if (installationService.isInstalled()) {
      return res.status(400).json({ success: false, message: 'Application is already installed' });
    }
    
    // Validate installation settings
    const validationResult = installationSettingsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid installation settings', 
        errors: validationResult.error.errors 
      });
    }
    
    // Install the application
    const installationSuccessful = await installationService.installApplication(validationResult.data);
    
    if (installationSuccessful) {
      res.json({ success: true, message: 'Installation successful' });
    } else {
      res.status(500).json({ success: false, message: 'Installation failed' });
    }
  } catch (error) {
    console.error('Installation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during installation',
      error: errorMessage
    });
  }
});

// Check if a particular database type is available on the server
router.post('/check-database', async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    
    if (!type || (type !== 'mysql' && type !== 'postgres')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid database type. Must be "mysql" or "postgres"' 
      });
    }
    
    // Check database availability using commands
    let available = false;
    
    if (type === 'mysql') {
      // Try connecting to MySQL with a minimal connection attempt
      try {
        const testConnection = await installationService.testMinimalDatabaseConnection({
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'information_schema', // This exists in all MySQL installations
          user: 'root',
          password: ''
        });
        available = testConnection;
      } catch (error) {
        // Failed to connect, MySQL might not be available
        available = false;
      }
    } else if (type === 'postgres') {
      // Try connecting to PostgreSQL with a minimal connection attempt
      try {
        const testConnection = await installationService.testMinimalDatabaseConnection({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          database: 'postgres', // This exists in all PostgreSQL installations
          user: 'postgres',
          password: ''
        });
        available = testConnection;
      } catch (error) {
        // Failed to connect, PostgreSQL might not be available
        available = false;
      }
    }
    
    // Try checking if the database is installed using system commands as fallback
    if (!available) {
      available = await checkDatabaseInstalled(type);
    }
    
    res.json({ available });
  } catch (error) {
    console.error('Database availability check error:', error);
    res.status(500).json({ 
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper to check if a database is installed using system commands
function checkDatabaseInstalled(type: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (type === 'mysql') {
      exec('which mysql', (error) => {
        resolve(!error);
      });
    } else if (type === 'postgres') {
      exec('which psql', (error) => {
        resolve(!error);
      });
    } else {
      resolve(false);
    }
  });
}

export default router;