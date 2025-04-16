import { Router, Request, Response } from 'express';
import { InstallationService, InstallationSettings, AdminUser } from '../install/InstallationService';
import { DatabaseConfig, DatabaseType } from '../database/adapters/DBAdapterFactory';
import { z } from 'zod';

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
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while testing the database connection',
      error: error.message
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
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred during installation',
      error: error.message
    });
  }
});

export default router;