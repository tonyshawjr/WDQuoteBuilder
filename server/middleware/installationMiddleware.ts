import { Request, Response, NextFunction } from 'express';
import { ConfigManager } from '../config/ConfigManager';

/**
 * Middleware to check if the application is installed
 * If not, redirects to the installation page
 */
export const installationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip this middleware for Vite resources, installation API routes, and static files
  if (req.path.startsWith('/api/install') || 
      req.path.startsWith('/install') ||
      req.path.startsWith('/assets') ||
      req.path.startsWith('/@fs/') ||
      req.path.startsWith('/@vite/') ||
      req.path.startsWith('/@react-refresh') ||
      req.path.startsWith('/src/') ||
      req.path.includes('node_modules') ||
      req.path.includes('.')) {
    return next();
  }

  const configManager = ConfigManager.getInstance();
  
  // If the application is not installed, redirect to the installation page
  if (!configManager.isInstalled()) {
    // For API requests, return a JSON response
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ 
        message: 'Application not installed', 
        status: 'not_installed',
        redirectTo: '/install'
      });
    }
    
    // For regular requests, redirect to the installation page
    return res.redirect('/install');
  }
  
  next();
};