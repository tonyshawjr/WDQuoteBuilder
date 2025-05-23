import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectTypeSchema, 
  insertFeatureSchema, 
  insertPageSchema,
  insertQuoteSchema,
  type SelectedFeature,
  type SelectedPage,
  type User,
  type Quote
} from "@shared/schema";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { installationMiddleware } from "./middleware/installationMiddleware";
import installRoutes from "./routes/installRoutes";

// Add to InsertQuote to match our SQL schema
declare module "@shared/schema" {
  interface InsertQuote {
    updatedAt?: string;
    createdBy?: string;
    updatedBy?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session storage
  const MemoryStoreSession = MemoryStore(session);
  
  app.use(session({
    secret: 'web-design-pricing-calculator-secret',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false,
      httpOnly: true,
      sameSite: 'lax'
    }
  }));
  
  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport local strategy
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (user.password !== password) { // In production, we'd use proper password hashing
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));
  
  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  
  // Auth middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  };
  
  const isAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.isAdmin) {
      return next();
    }
    res.status(403).json({ message: 'Forbidden' });
  };
  
  // Get all users (admin only)
  app.get('/api/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Create a new user (admin only)
  app.post('/api/users', isAdmin, async (req, res) => {
    try {
      // Debug: Log the entire request
      console.log('POST /api/users - Request headers:', req.headers);
      console.log('POST /api/users - Raw request body (typeof):', typeof req.body);
      console.log('POST /api/users - Request body:', JSON.stringify(req.body));
      
      // Direct access approach for debugging
      let username, password, email, firstName, lastName, isAdminFlag;
      
      // Try different ways to access the data
      if (typeof req.body === 'string') {
        try {
          const parsedBody = JSON.parse(req.body);
          username = parsedBody.username;
          password = parsedBody.password;
          email = parsedBody.email;
          firstName = parsedBody.firstName;
          lastName = parsedBody.lastName;
          isAdminFlag = parsedBody.isAdmin;
          console.log('Parsed string body:', parsedBody);
        } catch (e) {
          console.error('Failed to parse string body:', e);
        }
      } else {
        // Try accessing directly from body
        username = req.body.username;
        password = req.body.password;
        email = req.body.email;
        firstName = req.body.firstName;
        lastName = req.body.lastName;
        isAdminFlag = req.body.isAdmin;
      }
      
      // Fallback for testing
      if (!username || !password) {
        console.log('Using fallback method to access form data', req.body);
        if (req.body && typeof req.body === 'object') {
          // Try to find the username and password in any key
          Object.keys(req.body).forEach(key => {
            console.log(`Checking key: ${key}, value:`, req.body[key]);
            if (typeof req.body[key] === 'object' && req.body[key] !== null) {
              if (req.body[key].username) username = req.body[key].username;
              if (req.body[key].password) password = req.body[key].password;
              if (req.body[key].email) email = req.body[key].email;
              if (req.body[key].firstName) firstName = req.body[key].firstName;
              if (req.body[key].lastName) lastName = req.body[key].lastName;
              if (req.body[key].isAdmin !== undefined) isAdminFlag = req.body[key].isAdmin;
            }
          });
        }
      }
      
      // Log the extracted values
      console.log('Final extracted values:', { 
        username, 
        passwordLength: password ? password.length : 0,
        email,
        firstName,
        lastName,
        isAdmin: isAdminFlag
      });
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Using explicit values to ensure proper typing
      const userData = { 
        username: String(username), 
        password: String(password),
        email: email ? String(email) : null,
        firstName: firstName ? String(firstName) : null,
        lastName: lastName ? String(lastName) : null,
        isAdmin: isAdminFlag === true 
      };
      
      console.log('Creating user with data:', userData);
      
      const newUser = await storage.createUser(userData);
      
      console.log('User created successfully:', newUser);
      res.status(201).json(newUser);
    } catch (err) {
      console.error('User creation error:', err);
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  // Update a user (admin only)
  app.put('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { username, password, email, firstName, lastName, isAdmin: isAdminFlag } = req.body;
      
      console.log('PUT /api/users/:id - Request body:', {
        id,
        username,
        passwordLength: password ? password.length : 0,
        email,
        firstName,
        lastName,
        isAdmin: isAdminFlag
      });
      
      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if new username already exists (and it's not the current user)
      if (username && username !== existingUser.username) {
        const userWithSameUsername = await storage.getUserByUsername(username);
        if (userWithSameUsername && userWithSameUsername.id !== id) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      
      // Prepare update data
      const updateData = {
        username: username || existingUser.username,
        isAdmin: isAdminFlag === true || isAdminFlag === false ? isAdminFlag : existingUser.isAdmin,
        email: email !== undefined ? email : existingUser.email,
        firstName: firstName !== undefined ? firstName : existingUser.firstName,
        lastName: lastName !== undefined ? lastName : existingUser.lastName
      };
      
      // Only include password if it's not empty
      if (password) {
        updateData.password = password;
      } else {
        updateData.password = existingUser.password;
      }
      
      console.log('Updating user data:', updateData);
      
      const updatedUser = await storage.updateUser(id, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ message: 'Failed to update user' });
      }
      
      console.log('User updated successfully:', updatedUser);
      res.json(updatedUser);
    } catch (err) {
      console.error('User update error:', err);
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  // Delete a user (admin only)
  app.delete('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Prevent deleting yourself
      if (id === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ success });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update current user's profile
  app.put('/api/me/profile', isAuthenticated, async (req, res) => {
    try {
      const { username, password, email, firstName, lastName, currentPassword } = req.body;
      const userId = req.user.id;
      
      console.log('Profile update requested:', {
        userId,
        username,
        passwordUpdated: !!password,
        email,
        firstName,
        lastName
      });
      
      // Get the current user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      if (currentPassword !== user.password) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Check if new username already exists (and it's not the current user)
      if (username !== user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      
      // Update the user profile
      const updatedUser = await storage.updateUser(userId, {
        username: username || user.username,
        password: password || user.password,
        email: email !== undefined ? email : user.email,
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        isAdmin: user.isAdmin // Preserve admin status
      });
      
      // Update the user in the session
      req.login(updatedUser, (err) => {
        if (err) {
          console.error('Session update error:', err);
          return res.status(500).json({ message: 'Profile updated but session refresh failed' });
        }
        res.json(updatedUser);
      });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Auth routes
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error' });
      }
      
      if (!user) {
        console.log('Login failed:', info?.message || 'Unknown reason');
        return res.status(401).json({ message: info?.message || 'Authentication failed' });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Session login error:', loginErr);
          return res.status(500).json({ message: 'Login failed' });
        }
        
        console.log('User authenticated successfully:', user.username);
        return res.json(user);
      });
    })(req, res, next);
  });
  
  app.post('/api/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      req.session.destroy((err: any) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ success: false, message: 'Session destruction failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    });
  });
  
  // System Settings routes
  app.get('/api/business-name', async (req, res) => {
    try {
      const businessName = await storage.getBusinessName();
      res.json({ businessName });
    } catch (error) {
      console.error('Error getting business name:', error);
      res.status(500).json({ message: 'Error getting business name' });
    }
  });
  
  app.get('/api/system-settings', async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings || {
        businessName: null,
        lightModeColor: "#1E40AF", // Default blue
        darkModeColor: "#F9B200"   // Default yellow
      });
    } catch (error) {
      console.error('Error getting system settings:', error);
      res.status(500).json({ message: 'Error getting system settings' });
    }
  });
  
  app.post('/api/business-name', async (req, res) => {
    try {
      // Check if the user is an admin
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Only admins can update business name' });
      }
      
      const { businessName } = req.body;
      
      if (!businessName || typeof businessName !== 'string') {
        return res.status(400).json({ message: 'Business name is required' });
      }
      
      const success = await storage.updateBusinessName(businessName.trim());
      
      if (success) {
        res.json({ message: 'Business name updated successfully', businessName: businessName.trim() });
      } else {
        res.status(500).json({ message: 'Error updating business name' });
      }
    } catch (error) {
      console.error('Error updating business name:', error);
      res.status(500).json({ message: 'Error updating business name' });
    }
  });
  
  app.post('/api/brand-colors', async (req, res) => {
    try {
      // Check if the user is an admin
      if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Only admins can update brand colors' });
      }
      
      const { lightModeColor, darkModeColor } = req.body;
      
      if (!lightModeColor || !darkModeColor || 
          typeof lightModeColor !== 'string' || 
          typeof darkModeColor !== 'string') {
        return res.status(400).json({ message: 'Valid color values are required' });
      }
      
      const success = await storage.updateBrandColors(lightModeColor, darkModeColor);
      
      if (success) {
        res.json({ message: 'Brand colors updated successfully', lightModeColor, darkModeColor });
      } else {
        res.status(500).json({ message: 'Error updating brand colors' });
      }
    } catch (error) {
      console.error('Error updating brand colors:', error);
      res.status(500).json({ message: 'Error updating brand colors' });
    }
  });
  
  app.get('/api/me', (req, res) => {
    console.log('GET /api/me - Auth status:', req.isAuthenticated());
    if (req.isAuthenticated()) {
      console.log('Authenticated user:', req.user);
      res.json(req.user);
    } else {
      // Log session information for debugging
      console.log('Session ID:', req.sessionID);
      console.log('Session data:', req.session);
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
  
  // Project types routes
  app.get('/api/project-types', async (req, res) => {
    try {
      const projectTypes = await storage.getProjectTypes();
      res.json(projectTypes);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/project-types/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const projectType = await storage.getProjectType(id);
      
      if (!projectType) {
        return res.status(404).json({ message: 'Project type not found' });
      }
      
      res.json(projectType);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/project-types', isAdmin, async (req, res) => {
    try {
      const validatedData = insertProjectTypeSchema.parse(req.body);
      const projectType = await storage.createProjectType(validatedData);
      res.status(201).json(projectType);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.put('/api/project-types/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectTypeSchema.parse(req.body);
      const projectType = await storage.updateProjectType(id, validatedData);
      
      if (!projectType) {
        return res.status(404).json({ message: 'Project type not found' });
      }
      
      res.json(projectType);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.delete('/api/project-types/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProjectType(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Project type not found' });
      }
      
      res.json({ success });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Features routes
  app.get('/api/features', async (req, res) => {
    try {
      const features = await storage.getFeatures();
      res.json(features);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/project-types/:projectTypeId/features', async (req, res) => {
    try {
      const projectTypeId = parseInt(req.params.projectTypeId);
      const features = await storage.getFeaturesByProjectType(projectTypeId);
      res.json(features);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/features/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const feature = await storage.getFeature(id);
      
      if (!feature) {
        return res.status(404).json({ message: 'Feature not found' });
      }
      
      res.json(feature);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/features', isAdmin, async (req, res) => {
    try {
      // Extract the selectedProjectTypes array from request body
      const { selectedProjectTypes, ...featureData } = req.body;
      const validatedData = insertFeatureSchema.parse(featureData);
      
      // Create the feature and associate it with project types
      const feature = await storage.createFeature(validatedData);
      
      // Handle project type associations if not "For All Project Types"
      if (!validatedData.forAllProjectTypes && selectedProjectTypes && selectedProjectTypes.length > 0) {
        // Save feature-project type relationships
        for (const projectTypeId of selectedProjectTypes) {
          await storage.createFeatureProjectType({
            featureId: feature.id,
            projectTypeId
          });
        }
      }
      
      res.status(201).json(feature);
    } catch (err) {
      console.error('Error creating feature:', err);
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.put('/api/features/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Extract the selectedProjectTypes array from request body
      const { selectedProjectTypes, ...featureData } = req.body;
      const validatedData = insertFeatureSchema.parse(featureData);
      
      // Update the feature
      const feature = await storage.updateFeature(id, validatedData);
      
      if (!feature) {
        return res.status(404).json({ message: 'Feature not found' });
      }
      
      // Remove existing project type associations
      await storage.deleteFeatureProjectTypes(id);
      
      // Handle project type associations if not "For All Project Types"
      if (!validatedData.forAllProjectTypes && selectedProjectTypes && selectedProjectTypes.length > 0) {
        // Save feature-project type relationships
        for (const projectTypeId of selectedProjectTypes) {
          await storage.createFeatureProjectType({
            featureId: id,
            projectTypeId
          });
        }
      }
      
      res.json(feature);
    } catch (err) {
      console.error('Error updating feature:', err);
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.delete('/api/features/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First delete related feature-project type relationships
      // (This is now redundant since we have CASCADE, but we'll keep it for safety)
      await storage.deleteFeatureProjectTypes(id);
      
      // Then delete the feature itself
      const success = await storage.deleteFeature(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Feature not found' });
      }
      
      res.json({ success });
    } catch (err) {
      console.error('Error deleting feature:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Pages routes
  app.get('/api/pages', async (req, res) => {
    try {
      const pages = await storage.getPages();
      res.json(pages);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/pages/active', async (req, res) => {
    try {
      const pages = await storage.getActivePagesOnly();
      res.json(pages);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/project-types/:projectTypeId/pages', async (req, res) => {
    try {
      const projectTypeId = parseInt(req.params.projectTypeId);
      const pages = await storage.getPagesByProjectType(projectTypeId);
      res.json(pages);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/pages/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const page = await storage.getPage(id);
      
      if (!page) {
        return res.status(404).json({ message: 'Page not found' });
      }
      
      res.json(page);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/api/pages', isAdmin, async (req, res) => {
    try {
      const validatedData = insertPageSchema.parse(req.body);
      const page = await storage.createPage(validatedData);
      res.status(201).json(page);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.put('/api/pages/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPageSchema.parse(req.body);
      const page = await storage.updatePage(id, validatedData);
      
      if (!page) {
        return res.status(404).json({ message: 'Page not found' });
      }
      
      res.json(page);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.delete('/api/pages/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePage(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Page not found' });
      }
      
      res.json({ success });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Quotes routes
  app.get('/api/quotes', isAuthenticated, async (req, res) => {
    try {
      // Get user from session
      const user = req.user as User;
      
      // Admins can see all quotes, regular users only see their own quotes
      let quotes: Quote[];
      if (user.isAdmin) {
        quotes = await storage.getQuotes();
      } else {
        quotes = await storage.getQuotesByUser(user.id);
      }
      
      res.json(quotes);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/quotes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only access their own quotes
      if (!user.isAdmin && quote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(quote);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/quotes/:id/features', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only access their own quotes
      if (!user.isAdmin && quote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const features = await storage.getQuoteFeatures(id);
      res.json(features);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Add a feature to a quote
  app.post('/api/quotes/:quoteId/features', isAuthenticated, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      const { featureId, quantity, price } = req.body;
      
      if (isNaN(quoteId) || isNaN(featureId) || typeof quantity !== 'number' || typeof price !== 'number') {
        return res.status(400).json({ message: 'Invalid parameters' });
      }
      
      // Get the quote to make sure it exists
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only access their own quotes
      if (!user.isAdmin && quote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Get all current quote features
      const quoteFeatures = await storage.getQuoteFeatures(quoteId);
      
      // Check if this feature is already added to the quote
      if (quoteFeatures.some(f => f.featureId === featureId)) {
        return res.status(400).json({ message: 'Feature already added to quote' });
      }
      
      // Create a new quote feature entry
      const username = req.user ? (req.user as any).username || 'unknown' : 'unknown';
      const quoteFeature = {
        quoteId,
        featureId,
        quantity,
        price
      };
      
      // Add the feature and get pages to calculate the new total price
      const newQuoteFeature = await storage.updateQuoteFeature(quoteId, featureId, quoteFeature);
      const quotePages = await storage.getQuotePages(quoteId);
      
      // Get the project type to use its base price
      const projectTypeId = quote.projectTypeId || 0;
      const projectType = await storage.getProjectType(projectTypeId);
      if (!projectType) {
        return res.status(404).json({ message: 'Project type not found' });
      }
      
      // Get updated features list including the new one
      const updatedQuoteFeatures = await storage.getQuoteFeatures(quoteId);
      
      // Calculate total price based on features and pages plus the new feature
      const featuresTotal = updatedQuoteFeatures.reduce((sum, feature) => sum + feature.price, 0);
      const pagesTotal = quotePages.reduce((sum, page) => sum + page.price, 0);
      
      // Use the project type base price from admin settings
      const basePrice = projectType.basePrice || 0;
      const totalPrice = basePrice + featuresTotal + pagesTotal;
      
      // Update the quote with the new total price and set updatedBy
      await storage.updateQuote(quoteId, { 
        totalPrice,
        updatedBy: username,
        updatedAt: new Date().toISOString()
      });
      
      res.status(201).json(newQuoteFeature);
    } catch (err) {
      console.error('Error adding feature to quote:', err);
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.get('/api/quotes/:id/pages', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only access their own quotes
      if (!user.isAdmin && quote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const pages = await storage.getQuotePages(id);
      res.json(pages);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Add a page to a quote
  app.post('/api/quotes/:quoteId/pages', isAuthenticated, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      const { pageId, quantity, price } = req.body;
      
      if (isNaN(quoteId) || isNaN(pageId) || typeof quantity !== 'number' || typeof price !== 'number') {
        return res.status(400).json({ message: 'Invalid parameters' });
      }
      
      // Get the quote to make sure it exists
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only access their own quotes
      if (!user.isAdmin && quote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Get all current quote pages
      const quotePages = await storage.getQuotePages(quoteId);
      
      // Check if this page is already added to the quote
      if (quotePages.some(p => p.pageId === pageId)) {
        return res.status(400).json({ message: 'Page already added to quote' });
      }
      
      // Create a new quote page entry
      const username = req.user ? (req.user as any).username || 'unknown' : 'unknown';
      const quotePage = {
        quoteId,
        pageId,
        quantity,
        price
      };
      
      // We need to get all features to calculate the new total price
      const quoteFeatures = await storage.getQuoteFeatures(quoteId);
      
      // Get the project type to use its base price
      const projectTypeId = quote.projectTypeId || 0;
      const projectType = await storage.getProjectType(projectTypeId);
      if (!projectType) {
        return res.status(404).json({ message: 'Project type not found' });
      }
      
      // Add the page
      const newQuotePage = await storage.updateQuotePage(quoteId, pageId, quotePage);
      
      // Calculate total price based on features and pages plus the new page
      const featuresTotal = quoteFeatures.reduce((sum, feature) => sum + feature.price, 0);
      
      // Get updated pages list including the new one
      const updatedQuotePages = await storage.getQuotePages(quoteId);
      const pagesTotal = updatedQuotePages.reduce((sum, page) => sum + page.price, 0);
      
      // Use the project type base price from admin settings
      const basePrice = projectType.basePrice || 0;
      const totalPrice = basePrice + featuresTotal + pagesTotal;
      
      // Update the quote with the new total price and set updatedBy
      await storage.updateQuote(quoteId, { 
        totalPrice,
        updatedBy: username,
        updatedAt: new Date().toISOString()
      });
      
      res.status(201).json(newQuotePage);
    } catch (err) {
      console.error('Error adding page to quote:', err);
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  // Update a quote feature
  app.put('/api/quotes/:quoteId/features/:featureId', isAuthenticated, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      const featureId = parseInt(req.params.featureId);
      const { quantity, price } = req.body;
      
      if (isNaN(quoteId) || isNaN(featureId) || typeof quantity !== 'number' || typeof price !== 'number') {
        return res.status(400).json({ message: 'Invalid parameters' });
      }
      
      // Get the quote to check permissions before updating
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only modify their own quotes
      if (!user.isAdmin && quote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedFeature = await storage.updateQuoteFeature(quoteId, featureId, { quantity, price });
      
      if (!updatedFeature) {
        return res.status(404).json({ message: 'Quote feature not found' });
      }
      
      const quoteFeatures = await storage.getQuoteFeatures(quoteId);
      const quotePages = await storage.getQuotePages(quoteId);
      
      // Get the project type to use its base price
      const projectTypeId = quote.projectTypeId || 0;
      const projectType = await storage.getProjectType(projectTypeId);
      if (!projectType) {
        return res.status(404).json({ message: 'Project type not found' });
      }
      
      // Calculate total price based on features and pages
      const featuresTotal = quoteFeatures.reduce((sum, feature) => sum + feature.price, 0);
      const pagesTotal = quotePages.reduce((sum, page) => sum + page.price, 0);
      
      // Use the project type base price from admin settings
      const basePrice = projectType.basePrice || 0;
      const totalPrice = basePrice + featuresTotal + pagesTotal;
      
      // Update the quote with the new total price
      await storage.updateQuote(quoteId, { totalPrice });
      
      res.json(updatedFeature);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  // Update a quote page
  app.put('/api/quotes/:quoteId/pages/:pageId', isAuthenticated, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.quoteId);
      const pageId = parseInt(req.params.pageId);
      const { quantity, price } = req.body;
      
      if (isNaN(quoteId) || isNaN(pageId) || typeof quantity !== 'number' || typeof price !== 'number') {
        return res.status(400).json({ message: 'Invalid parameters' });
      }
      
      // Get the quote to check permissions before updating
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only modify their own quotes
      if (!user.isAdmin && quote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const updatedPage = await storage.updateQuotePage(quoteId, pageId, { quantity, price });
      
      if (!updatedPage) {
        return res.status(404).json({ message: 'Quote page not found' });
      }
      
      const quoteFeatures = await storage.getQuoteFeatures(quoteId);
      const quotePages = await storage.getQuotePages(quoteId);
      
      // Get the project type to use its base price
      const projectTypeId = quote.projectTypeId || 0;
      const projectType = await storage.getProjectType(projectTypeId);
      if (!projectType) {
        return res.status(404).json({ message: 'Project type not found' });
      }
      
      // Calculate total price based on features and pages
      const featuresTotal = quoteFeatures.reduce((sum, feature) => sum + feature.price, 0);
      const pagesTotal = quotePages.reduce((sum, page) => sum + page.price, 0);
      
      // Use the project type base price from admin settings
      const basePrice = projectType.basePrice || 0;
      const totalPrice = basePrice + featuresTotal + pagesTotal;
      
      // Update the quote with the new total price
      await storage.updateQuote(quoteId, { totalPrice });
      
      res.json(updatedPage);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.post('/api/quotes', isAuthenticated, async (req, res) => {
    try {
      const { quote, selectedFeatures, selectedPages } = req.body;
      
      // Validate quote data
      const validatedQuote = insertQuoteSchema.parse({
        ...quote,
        // Set the createdBy field to the current user's username
        createdBy: req.user?.username || ''
      });
      
      // Create the quote and its related items
      const createdQuote = await storage.createQuote(
        validatedQuote,
        selectedFeatures,
        selectedPages
      );
      
      res.status(201).json(createdQuote);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.put('/api/quotes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the quote first to check permissions
      const existingQuote = await storage.getQuote(id);
      if (!existingQuote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only modify their own quotes
      if (!user.isAdmin && existingQuote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const validatedData = insertQuoteSchema.partial().parse(req.body);
      
      // Set the updatedBy field to the current user's username
      validatedData.updatedBy = user.username;
      
      // Only admins can reassign quotes to different users
      if (validatedData.createdBy && !user.isAdmin) {
        delete validatedData.createdBy;
      }
      
      const quote = await storage.updateQuote(id, validatedData);
      
      res.json(quote);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.patch('/api/quotes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { leadStatus } = req.body;
      
      // Get the quote first to check permissions
      const existingQuote = await storage.getQuote(id);
      if (!existingQuote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only modify their own quotes
      if (!user.isAdmin && existingQuote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Only allow updating status
      const quote = await storage.updateQuote(id, { leadStatus });
      
      res.json(quote);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.delete('/api/quotes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the quote first to check permissions
      const existingQuote = await storage.getQuote(id);
      if (!existingQuote) {
        return res.status(404).json({ message: 'Quote not found' });
      }
      
      // Get user from session
      const user = req.user as User;
      
      // If not admin, ensure the user can only delete their own quotes
      if (!user.isAdmin && existingQuote.createdBy !== user.username) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const success = await storage.deleteQuote(id);
      
      res.json({ success });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Report: Feature Usage Analysis - Shows most used features across all quotes
  app.get('/api/reports/feature-usage', isAuthenticated, async (req, res) => {
    try {
      // Only admin users can access this report
      const user = req.user as User;
      if (!user.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const timeRange = req.query.timeRange as string || 'all';
      
      // Get all quotes
      const quotes = await storage.getQuotes();
      
      // Get all features for reference
      const features = await storage.getFeatures();
      
      // Filter quotes by time range if needed
      let filteredQuotes = quotes;
      if (timeRange !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        
        if (timeRange === 'past30days') {
          cutoffDate.setDate(now.getDate() - 30);
        } else if (timeRange === 'past90days') {
          cutoffDate.setDate(now.getDate() - 90);
        } else if (timeRange === 'pastyear') {
          cutoffDate.setFullYear(now.getFullYear() - 1);
        }
        
        filteredQuotes = quotes.filter(quote => {
          const quoteDate = new Date(quote.createdAt);
          return quoteDate >= cutoffDate;
        });
      }
      
      // Get usage data for all features
      const featureUsageMap = new Map<number, { count: number, totalRevenue: number }>();
      
      // Process each quote to count feature occurrences
      for (const quote of filteredQuotes) {
        const quoteFeatures = await storage.getQuoteFeatures(quote.id);
        
        for (const quoteFeature of quoteFeatures) {
          const { featureId, quantity, price } = quoteFeature;
          
          if (!featureUsageMap.has(featureId)) {
            featureUsageMap.set(featureId, { count: 0, totalRevenue: 0 });
          }
          
          const featureData = featureUsageMap.get(featureId)!;
          featureData.count += 1;
          featureData.totalRevenue += price * quantity;
          featureUsageMap.set(featureId, featureData);
        }
      }
      
      // Convert map to array and add feature names
      const featureUsage = Array.from(featureUsageMap.entries()).map(([featureId, data]) => {
        const feature = features.find(f => f.id === featureId);
        return {
          featureId,
          featureName: feature ? feature.name : 'Unknown Feature',
          count: data.count,
          totalRevenue: data.totalRevenue
        };
      });
      
      // Sort by usage count (descending)
      featureUsage.sort((a, b) => b.count - a.count);
      
      res.json({
        featureUsage,
        totalQuotes: filteredQuotes.length,
        timeRange
      });
    } catch (error) {
      console.error('Error generating feature usage report:', error);
      res.status(500).json({ error: 'Failed to generate feature usage report' });
    }
  });
  
  // Report: Quote Metrics - Shows aggregate metrics about quotes
  app.get('/api/reports/quote-metrics', isAuthenticated, async (req, res) => {
    try {
      // Only admin users can access this report
      const user = req.user as User;
      if (!user.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const timeRange = req.query.timeRange as string || 'all';
      
      // Get all quotes
      const quotes = await storage.getQuotes();
      
      // Filter quotes by time range if needed
      let filteredQuotes = quotes;
      if (timeRange !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        
        if (timeRange === 'past30days') {
          cutoffDate.setDate(now.getDate() - 30);
        } else if (timeRange === 'past90days') {
          cutoffDate.setDate(now.getDate() - 90);
        } else if (timeRange === 'pastyear') {
          cutoffDate.setFullYear(now.getFullYear() - 1);
        }
        
        filteredQuotes = quotes.filter(quote => {
          const quoteDate = new Date(quote.createdAt);
          return quoteDate >= cutoffDate;
        });
      }
      
      // Calculate total revenue
      const totalRevenue = filteredQuotes.reduce((sum, quote) => sum + quote.totalPrice, 0);
      
      // Calculate average quote size
      const averageQuoteSize = filteredQuotes.length > 0 
        ? totalRevenue / filteredQuotes.length 
        : 0;
      
      // Group quotes by status
      const statusCounts: Record<string, { count: number, value: number }> = {};
      filteredQuotes.forEach(quote => {
        const status = quote.leadStatus || 'Proposal Sent';
        if (!statusCounts[status]) {
          statusCounts[status] = { count: 0, value: 0 };
        }
        statusCounts[status].count += 1;
        statusCounts[status].value += quote.totalPrice;
      });
      
      // Prepare status distribution data
      const quoteStatusDistribution = Object.entries(statusCounts).map(([status, data]) => ({
        status,
        count: data.count,
        value: data.value
      }));
      
      // Calculate quote size distribution
      const quoteSizeDistribution = {
        small: 0,      // $0 - $5,500
        medium: 0,     // $5,500 - $10,500
        large: 0,      // $10,500 - $25,500
        enterprise: 0  // > $25,500
      };
      
      filteredQuotes.forEach(quote => {
        const price = quote.totalPrice;
        if (price < 5500) {
          quoteSizeDistribution.small += 1;
        } else if (price < 10500) {
          quoteSizeDistribution.medium += 1;
        } else if (price < 25500) {
          quoteSizeDistribution.large += 1;
        } else {
          quoteSizeDistribution.enterprise += 1;
        }
      });
      
      // Calculate conversion metrics
      const wonQuotes = filteredQuotes.filter(quote => quote.leadStatus === 'Won');
      const potentialQuotes = filteredQuotes.filter(quote => 
        quote.leadStatus !== 'Won' && quote.leadStatus !== 'Lost'
      );
      
      const wonRevenue = wonQuotes.reduce((sum, quote) => sum + quote.totalPrice, 0);
      const potentialRevenue = potentialQuotes.reduce((sum, quote) => sum + quote.totalPrice, 0);
      
      const conversionRate = filteredQuotes.length > 0
        ? wonQuotes.length / filteredQuotes.length
        : 0;
      
      // Group quotes by month for trend analysis
      const quotesByMonth = new Map<string, { count: number, totalSize: number }>();
      
      filteredQuotes.forEach(quote => {
        const date = new Date(quote.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!quotesByMonth.has(monthKey)) {
          quotesByMonth.set(monthKey, { count: 0, totalSize: 0 });
        }
        
        const monthData = quotesByMonth.get(monthKey)!;
        monthData.count += 1;
        monthData.totalSize += quote.totalPrice;
        quotesByMonth.set(monthKey, monthData);
      });
      
      // Prepare data for charts
      const quoteSizesByMonth = Array.from(quotesByMonth.entries())
        .map(([month, data]) => ({
          month,
          count: data.count,
          averageSize: data.count > 0 ? data.totalSize / data.count : 0
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
      
      res.json({
        averageQuoteSize,
        quoteSizesByMonth,
        quoteStatusDistribution,
        quoteSizeDistribution,
        totalQuotes: filteredQuotes.length,
        totalRevenue,
        conversionRate,
        wonRevenue,
        potentialRevenue,
        timeRange
      });
    } catch (error) {
      console.error('Error generating quote metrics report:', error);
      res.status(500).json({ error: 'Failed to generate quote metrics report' });
    }
  });
  
  // Report: Sales Team Performance - Shows metrics about sales team performance
  app.get('/api/reports/sales-performance', isAuthenticated, async (req, res) => {
    try {
      // Only admin users can access this report
      const user = req.user as User;
      if (!user.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      
      const timeRange = req.query.timeRange as string || 'all';
      
      // Get all users and quotes
      const users = await storage.getUsers();
      const quotes = await storage.getQuotes();
      
      // Filter quotes by time range if needed
      let filteredQuotes = quotes;
      if (timeRange !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        
        if (timeRange === 'past30days') {
          cutoffDate.setDate(now.getDate() - 30);
        } else if (timeRange === 'past90days') {
          cutoffDate.setDate(now.getDate() - 90);
        } else if (timeRange === 'pastyear') {
          cutoffDate.setFullYear(now.getFullYear() - 1);
        }
        
        filteredQuotes = quotes.filter(quote => {
          const quoteDate = new Date(quote.createdAt);
          return quoteDate >= cutoffDate;
        });
      }
      
      // Group quotes by sales person (quote.createdBy)
      const salesPerformance: Record<string, {
        name: string,
        totalQuotes: number,
        totalRevenue: number,
        wonQuotes: number,
        wonRevenue: number,
        lostQuotes: number,
        lostRevenue?: number,
        pendingQuotes: number,
        averageQuoteSize: number,
        conversionRate: number
      }> = {};
      
      // Initialize with all users who have created quotes
      const quoteCreators = new Set<string>();
      filteredQuotes.forEach(quote => {
        if (quote.createdBy) {
          quoteCreators.add(quote.createdBy);
        }
      });
      
      // Add all users from the users table as well
      users.forEach(user => {
        if (user.username) {
          quoteCreators.add(user.username);
        }
      });
      
      // Initialize sales performance object
      quoteCreators.forEach(username => {
        // Find the user's full name if available
        const userRecord = users.find(u => u.username === username);
        const displayName = userRecord && userRecord.firstName && userRecord.lastName
          ? `${userRecord.firstName} ${userRecord.lastName}`
          : username;
        
        salesPerformance[username] = {
          name: displayName,
          totalQuotes: 0,
          totalRevenue: 0,
          wonQuotes: 0,
          wonRevenue: 0,
          lostQuotes: 0,
          pendingQuotes: 0,
          averageQuoteSize: 0,
          conversionRate: 0
        };
      });
      
      // Populate sales performance data
      filteredQuotes.forEach(quote => {
        const createdBy = quote.createdBy || 'unknown';
        
        if (!salesPerformance[createdBy]) {
          salesPerformance[createdBy] = {
            name: createdBy,
            totalQuotes: 0,
            totalRevenue: 0,
            wonQuotes: 0,
            wonRevenue: 0,
            lostQuotes: 0,
            pendingQuotes: 0,
            averageQuoteSize: 0,
            conversionRate: 0
          };
        }
        
        const salesPerson = salesPerformance[createdBy];
        salesPerson.totalQuotes += 1;
        salesPerson.totalRevenue += quote.totalPrice;
        
        if (quote.leadStatus === 'Won') {
          salesPerson.wonQuotes += 1;
          salesPerson.wonRevenue += quote.totalPrice;
        } else if (quote.leadStatus === 'Lost') {
          salesPerson.lostQuotes += 1;
          salesPerson.lostRevenue = (salesPerson.lostRevenue || 0) + quote.totalPrice;
        } else {
          salesPerson.pendingQuotes += 1;
        }
      });
      
      // Calculate derived metrics
      Object.values(salesPerformance).forEach(salesPerson => {
        if (salesPerson.totalQuotes > 0) {
          salesPerson.averageQuoteSize = salesPerson.totalRevenue / salesPerson.totalQuotes;
          salesPerson.conversionRate = salesPerson.totalQuotes > 0
            ? salesPerson.wonQuotes / salesPerson.totalQuotes
            : 0;
        }
      });
      
      // Convert to array and sort by total revenue (descending)
      const salesPerformanceArray = Object.entries(salesPerformance).map(([username, data]) => ({
        username,
        ...data
      })).sort((a, b) => b.totalRevenue - a.totalRevenue);
      
      // Calculate team totals
      const teamTotals = {
        totalQuotes: filteredQuotes.length,
        totalRevenue: filteredQuotes.reduce((sum, quote) => sum + quote.totalPrice, 0),
        wonQuotes: filteredQuotes.filter(quote => quote.leadStatus === 'Won').length,
        wonRevenue: filteredQuotes
          .filter(quote => quote.leadStatus === 'Won')
          .reduce((sum, quote) => sum + quote.totalPrice, 0),
        lostQuotes: filteredQuotes.filter(quote => quote.leadStatus === 'Lost').length,
        pendingQuotes: filteredQuotes.filter(quote => 
          quote.leadStatus !== 'Won' && quote.leadStatus !== 'Lost'
        ).length,
        averageQuoteSize: filteredQuotes.length > 0
          ? filteredQuotes.reduce((sum, quote) => sum + quote.totalPrice, 0) / filteredQuotes.length
          : 0,
        conversionRate: filteredQuotes.length > 0
          ? filteredQuotes.filter(quote => quote.leadStatus === 'Won').length / filteredQuotes.length
          : 0
      };
      
      // Calculate monthly performance by user
      const monthlyPerformance: Record<string, Record<string, {
        totalQuotes: number,
        totalRevenue: number
      }>> = {};
      
      filteredQuotes.forEach(quote => {
        const date = new Date(quote.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const createdBy = quote.createdBy || 'unknown';
        
        if (!monthlyPerformance[monthKey]) {
          monthlyPerformance[monthKey] = {};
        }
        
        if (!monthlyPerformance[monthKey][createdBy]) {
          monthlyPerformance[monthKey][createdBy] = {
            totalQuotes: 0,
            totalRevenue: 0
          };
        }
        
        monthlyPerformance[monthKey][createdBy].totalQuotes += 1;
        monthlyPerformance[monthKey][createdBy].totalRevenue += quote.totalPrice;
      });
      
      // Format monthly performance for charting
      const monthlyPerformanceChart = Object.entries(monthlyPerformance)
        .map(([month, userData]) => {
          const monthData: Record<string, any> = { month };
          
          Object.entries(userData).forEach(([user, data]) => {
            monthData[`${user}_quotes`] = data.totalQuotes;
            monthData[`${user}_revenue`] = data.totalRevenue;
          });
          
          return monthData;
        })
        .sort((a, b) => a.month.localeCompare(b.month));
      
      res.json({
        salesPerformance: salesPerformanceArray,
        teamTotals,
        monthlyPerformanceChart,
        timeRange
      });
    } catch (error) {
      console.error('Error generating sales performance report:', error);
      res.status(500).json({ error: 'Failed to generate sales performance report' });
    }
  });

  // Apply installation middleware - This will check if the app is installed
  // and redirect to the installation page if needed
  app.use(installationMiddleware);

  // Install routes - Handle installation API endpoints
  app.use('/api/install', installRoutes);

  const httpServer = createServer(app);
  return httpServer;
}