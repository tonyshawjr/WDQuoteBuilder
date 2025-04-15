import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectTypeSchema, insertFeatureSchema } from "@shared/schema";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";

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
  
  const httpServer = createServer(app);
  return httpServer;
}
