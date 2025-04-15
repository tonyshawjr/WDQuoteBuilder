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
      const validatedData = insertFeatureSchema.parse(req.body);
      const feature = await storage.createFeature(validatedData);
      res.status(201).json(feature);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.put('/api/features/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertFeatureSchema.parse(req.body);
      const feature = await storage.updateFeature(id, validatedData);
      
      if (!feature) {
        return res.status(404).json({ message: 'Feature not found' });
      }
      
      res.json(feature);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : 'Invalid data' });
    }
  });
  
  app.delete('/api/features/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFeature(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Feature not found' });
      }
      
      res.json({ success });
    } catch (err) {
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
      if (!user.isAdmin && quote.createdBy !== user.id.toString()) {
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
      if (!user.isAdmin && quote.createdBy !== user.id.toString()) {
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
      if (!user.isAdmin && quote.createdBy !== user.id.toString()) {
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
      if (!user.isAdmin && quote.createdBy !== user.id.toString()) {
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
      if (!user.isAdmin && quote.createdBy !== user.id.toString()) {
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
      if (!user.isAdmin && quote.createdBy !== user.id.toString()) {
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
      if (!user.isAdmin && quote.createdBy !== user.id.toString()) {
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
      const validatedQuote = insertQuoteSchema.parse(quote);
      
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
      if (!user.isAdmin && existingQuote.createdBy !== user.id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const validatedData = insertQuoteSchema.partial().parse(req.body);
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
      if (!user.isAdmin && existingQuote.createdBy !== user.id.toString()) {
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
      if (!user.isAdmin && existingQuote.createdBy !== user.id.toString()) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const success = await storage.deleteQuote(id);
      
      res.json({ success });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}