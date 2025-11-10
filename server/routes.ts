import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./db-storage";
import { db } from "./db";
import { expenseSplits } from "@shared/schema";
import { 
  insertUserSchema, insertTripSchema, insertTripMemberSchema, 
  insertActivitySchema, insertActivityRsvpSchema, insertMessageSchema,
  insertSurveyQuestionSchema, insertSurveyResponseSchema, insertInvitationLinkSchema,
  insertExpenseSchema, insertFlightInfoSchema, insertPollSchema, insertPollVoteSchema,
  User
} from "@shared/schema";
import { expenses } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from 'bcrypt';
import { sendEmail, getEmailStatus } from './email';
import passport from './google-auth';
import { validateNumericId, ValidationError, parseAndValidateId } from './id-validation';
import { encryptId, decryptId, parseUrlId } from './url-encryption';

// Generate a random token for password reset
function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Simple rate limiting for forgot password requests
const forgotPasswordAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 3; // Maximum attempts per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const attempts = forgotPasswordAttempts.get(email);
  
  if (!attempts) {
    return false;
  }
  
  // Reset if window has passed
  if (now - attempts.lastAttempt > RATE_LIMIT_WINDOW) {
    forgotPasswordAttempts.delete(email);
    return false;
  }
  
  return attempts.count >= MAX_ATTEMPTS;
}

function recordForgotPasswordAttempt(email: string): void {
  const now = Date.now();
  const attempts = forgotPasswordAttempts.get(email);
  
  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = now;
  } else {
    forgotPasswordAttempts.set(email, { count: 1, lastAttempt: now });
  }
}

const saltRounds = 10;
const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

// Helper function to get MIME type from file path
function getMimeTypeFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/png';
  }
}


interface WebSocketClient extends WebSocket {
  userId?: number;
  tripIds?: number[];
}

interface MessageEvent {
  type: string;
  data: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  const httpServer = createServer(app);
  
  // Note: Session middleware is already configured in server/index.ts
  // Do not duplicate session configuration here as it will override the correct cookie domain settings
  
  // Helper function to check for authenticated user
  const ensureUser = (req: Request, res: Response): User | null => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return null;
    }
    return req.user;
  };
  
  // Setup WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocketClient) => {
    ws.on('message', async (message) => {
      try {
        const event: MessageEvent = JSON.parse(message.toString());
        
        if (event.type === 'auth') {
          // Authenticate the WebSocket connection
          const { userId, tripIds } = event.data;
          ws.userId = userId;
          ws.tripIds = tripIds;
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
  });
  
  // Helper function to broadcast messages to all clients in a trip
  function broadcastToTrip(wss: WebSocketServer, tripId: number, message: any) {
    wss.clients.forEach((client: WebSocketClient) => {
      if (client.readyState === WebSocket.OPEN && client.tripIds?.includes(tripId)) {
        client.send(JSON.stringify(message));
      }
    });
  }
  
  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const healthStatus = {
        status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        email: getEmailStatus(),
        database: 'connected', // We'll assume it's connected if we reach this point
        version: '1.0.0'
      };
      
      res.json(healthStatus);
    } catch (error) {
      res.status(500).json({ 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Contact form endpoint
  router.post('/contact', async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, subject, message } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !subject || !message) {
        return res.status(400).json({ 
          message: 'All fields are required' 
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Please provide a valid email address' 
        });
      }

      // Create email content
      const emailSubject = `Contact Form: ${subject}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Contact Details</h3>
            <p><strong>Name:</strong> ${firstName} ${lastName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #374151; margin-top: 0;">Message</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 8px; font-size: 14px; color: #6b7280;">
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>From:</strong> Navigator Contact Form</p>
          </div>
        </div>
      `;

      // Send email using existing email system
      await sendEmail('info@navigatortrips.com', emailSubject, emailHtml);

      console.log('✅ Contact form email sent successfully:', {
        from: email,
        subject: subject,
        timestamp: new Date().toISOString()
      });

      res.json({ 
        message: 'Thank you for your message! We\'ll get back to you within 24 hours.' 
      });

    } catch (error) {
      console.error('❌ Contact form error:', error);
      res.status(500).json({ 
        message: 'Failed to send message. Please try again later.' 
      });
    }
  });

  // Simple ping endpoint for basic connectivity testing
  router.get('/ping', (req: Request, res: Response) => {
    console.log('🏓 Ping requested');
    res.status(200).json({ message: 'pong', timestamp: new Date().toISOString() });
  });

  // Test endpoint to verify server is working
  router.get('/test', (req: Request, res: Response) => {
    console.log('🧪 Test endpoint hit');
    res.status(200).json({ 
      message: 'Server is working', 
      timestamp: new Date().toISOString(),
      emailModule: 'loaded'
    });
  });

  // Google Places API routes
  router.get('/places/autocomplete', async (req: Request, res: Response) => {
    try {
      const { input, sessionToken } = req.query;
      
      if (!input || typeof input !== 'string') {
        return res.status(400).json({ message: 'Input parameter is required' });
      }

      const { getPlaceAutocomplete } = await import('./google-places');
      const result = await getPlaceAutocomplete(input, sessionToken as string);
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ Places autocomplete error:', error);
      res.status(500).json({ message: 'Failed to get place autocomplete', error: error.message });
    }
  });

  router.get('/places/details', async (req: Request, res: Response) => {
    try {
      const { placeId, sessionToken } = req.query;
      
      if (!placeId || typeof placeId !== 'string') {
        return res.status(400).json({ message: 'Place ID parameter is required' });
      }

      const { getPlaceDetails } = await import('./google-places');
      const result = await getPlaceDetails(placeId, sessionToken as string);
      
      res.json(result);
    } catch (error: any) {
      console.error('❌ Place details error:', error);
      res.status(500).json({ message: 'Failed to get place details', error: error.message });
    }
  });

  
  // Username validation endpoint
  router.get('/users/validate', async (req: Request, res: Response) => {
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username parameter is required' });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      if (user) {
        return res.status(200).json({ valid: true, userId: user.id });
      } else {
        return res.status(404).json({ valid: false, message: 'Username not found' });
      }
    } catch (error) {
      console.error('Error validating username:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Check if user is already a member of a trip
  router.get('/trips/:id/check-member', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username } = req.query;
    
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ message: 'Username parameter is required' });
    }
    
    try {
      // First find the user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return rges.status(404).json({ isMember: false, message: 'User not found' });
      }
      
      // Then check if they're a member
      const tripId = parseInt(id);
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      return res.status(200).json({ 
        isMember,
        message: isMember ? 'User is already a member of this trip' : 'User is not a member of this trip'
      });
    } catch (error) {
      console.error('Error checking trip membership:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Auth Routes
  router.post('/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      // Check if username already exists
      if(!passwordRules.test(userData.password)) {
        return res.status(400).json({
          message: "password must be at least 8 characters and include; Uppercase, Lowercase, number, and a special character"
        });
      }
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        // Check if account is deleted - trigger recovery flow
        if (existingEmail.deletedAt) {
          return res.status(200).json({
            requiresRecovery: true,
            deletedAt: existingEmail.deletedAt,
            message: 'This email was used for a deleted account. You can recover it to continue.',
            email: existingEmail.email
          });
        }
        return res.status(400).json({ message: 'Email already registered' });
      }
      // Hash the password before saving
      userData.password = await bcrypt.hash(userData.password, saltRounds);
      
      const emailConfirmationToken = generateToken();
      userData.emailConfirmed = false;
      userData.emailConfirmationToken = emailConfirmationToken;
      
      console.log(`🔐 Generated email confirmation token: ${emailConfirmationToken.substring(0, 8)}...`);
      console.log(`📧 User data before creation:`, {
        username: userData.username,
        email: userData.email,
        emailConfirmed: userData.emailConfirmed,
        hasToken: !!userData.emailConfirmationToken
      });
      
      // Create user
      const user = await storage.createUser(userData);
      
      console.log(`✅ User created with ID: ${user.id}`);
      console.log(`📧 User after creation:`, {
        id: user.id,
        username: user.username,
        email: user.email,
        emailConfirmed: user.emailConfirmed,
        hasToken: !!user.emailConfirmationToken,
        tokenLength: user.emailConfirmationToken?.length
      });
      
      // Send confirmation email (log to console)
      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm-email?token=${emailConfirmationToken}`;
      try {
        // ... existing code ...
        await sendEmail(
          user.email,
          'Welcome to Navigator - Confirm Your Email',
          `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Your Email</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #044674; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; color: #000000; }
              .button { display: inline-block; background: #044674; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .highlight { background: #eef6ff; border: 1px solid #cde0ff; padding: 15px; border-radius: 5px; margin: 20px 0; color: #000000; }
            </style>
          </head>
          <body>
            <div class="header">
              <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                <div>
                  <h1 style="margin: 0;">Navigator</h1>
                  <p style="margin: 0;">The world is waiting</p>
            </div>
              </div>
            </div>
        
            <div class="content">
              <h2>Hello ${userData.name},</h2>
              <p>Thank you for signing up for Navigator. We're excited to have you join our community of travelers and planners.</p>
              
              <div class="highlight">
                To get started, please confirm your email address so we can activate your account.
              </div>
              
              <div style="text-align: center;">
                <a href="${confirmUrl}" class="button" style="color: white;">Confirm My Email</a>
              </div>
              
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color:#000000;">${confirmUrl}</p>
        
              <p>With Navigator, you can:</p>
              <ul>
                <li>Create and join trips with friends and family</li>
                <li>Plan daily itineraries with ease</li>
                <li>Track expenses and manage budgets</li>
                <li>Discover and share new destinations</li>
                <li>Access your plans from any device</li>
              </ul>
              
              <p>We look forward to helping you make your next trip unforgettable.</p>
            </div>
        
            <div class="footer">
              <p>Navigator – Your travel planning companion</p>
              <p>© ${new Date().getFullYear()} Navigator. All rights reserved.</p>
            </div>
          </body>
          </html>
          `
        );
// ... existing code ...
        
        
        console.log(`✅ Welcome email sent successfully to: ${user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send welcome email:', emailError);
        
        // Check if it's due to missing SMTP configuration
        if (emailError instanceof Error && emailError.message.includes('SMTP not configured')) {
          console.warn('⚠️ Email functionality is disabled - user registered without email confirmation');
          console.log(`📧 Would have sent confirmation email to: ${user.email}`);
          console.log(`📧 Confirmation URL: ${confirmUrl}`);
        } else {
          // Log other email errors but don't fail registration
          console.error('❌ Email error during registration:', emailError);
        }
      }
      
      // Don't send password in the response
      const { password, ...userWithoutPassword } = user;
      
      // Don't return a token - user must confirm email first
      console.log(`✅ User ${user.id} registered successfully. Email confirmation required.`);
      
      // Return user data without token, indicating email confirmation is needed
      res.status(201).json({
        ...userWithoutPassword,
        message: 'Registration successful! Please check your email to confirm your account.',
        requiresEmailConfirmation: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      if (!username && !email) {
        return res.status(400).json({ message: 'Username or email is required' });
      }
      
      // Try to find user by username or email
      let user;
      if (username) {
        user = await storage.getUserByUsername(username);
        console.log(`Attempting login for username: ${username}`);
      } else if (email) {
        user = await storage.getUserByEmail(email);
        console.log(`Attempting login for email: ${email}`);
      }
      
      // Debug log to check if user was found
      console.log('User found in database:', !!user);
      if (!user) {
        console.log('Login failed: Invalid username/email or password');
        return res.status(401).json({ message: 'Invalid username/email or password' });
      }
      // Check if password is hashed (bcrypt hashes start with $2)
      let isMatch = false;
      if (user.password && user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        // Legacy: compare plaintext
        isMatch = password === user.password;
        // If match, upgrade to hash
        if (isMatch) {
          const newHash = await bcrypt.hash(password, saltRounds);
          await storage.updateUser(user.id, { password: newHash });
        }
      }
      if (!isMatch) {
        console.log('Login failed: Invalid username/email or password');
        return res.status(401).json({ message: 'Invalid username/email or password' });
      }
      
      // Check if account is deleted - trigger recovery flow
      if (user.deletedAt) {
        console.log('🔍 Login attempt for deleted account:', user.id);
        return res.status(200).json({
          requiresRecovery: true,
          deletedAt: user.deletedAt,
          message: 'This account was deleted. We\'ll send a recovery email to verify it\'s you.',
          email: user.email // Send email for recovery request
        });
      }
      
      // Block login if email is not confirmed
      if (!user.emailConfirmed) {
        return res.status(403).json({ message: 'Please confirm your email before logging in.' });
      }
      // Don't send password in the response
      const { password: _, ...userWithoutPassword } = user;
      // Set session for session-based authentication
      if (req.session) {
        req.session.userId = user.id;
      }
      // Generate token (format: userId_token for compatibility with middleware)
      const token = `${user.id}_${generateToken()}`;
      const loginIdentifier = username || email;
      console.log('Login successful for:', loginIdentifier);
      // Return user data with token
      res.json({
        ...userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/auth/logout', (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err: Error | null) => {
        if (err) {
          return res.status(500).json({ message: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
      });
    } else {
      res.json({ message: 'No active session' });
    }
  });
  
  router.get('/auth/me', async (req: Request, res: Response) => {
    try {
      console.log('🔍 /api/auth/me called');
      console.log('🔍 Request headers:', req.headers);
      console.log('🔍 Cookie header:', req.headers.cookie);
      console.log('🔍 Session ID:', req.sessionID);
      console.log('🔍 Session exists:', !!req.session);
      console.log('🔍 Session userId:', req.session?.userId);
      console.log('🔍 Authorization header:', req.headers.authorization);
      
      // Check for token-based authentication first
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        console.log('🔍 Auth check: Token received:', token);
        console.log('🔍 Auth check: Token type:', typeof token);
        console.log('🔍 Auth check: Token length:', token.length);
        
        // Handle OAuth temporary tokens (format: userId_oauth_temp)
        if (token.includes('_oauth_temp')) {
          const userId = parseInt(token.split('_')[0]);
          console.log('🔍 Auth check: OAuth token detected, userId:', userId);
          
          if (!isNaN(userId)) {
          const user = await storage.getUser(userId);
          if (user) {
            console.log('🔍 Auth check: OAuth user found:', user.username);
            // Don't send password in the response
            const { password, ...userWithoutPassword } = user;
            // Note: We still return deleted users here so frontend can handle display
            // But isAuthenticated middleware will block them from accessing resources
            return res.json(userWithoutPassword);
          } else {
              console.log('❌ Auth check: OAuth user not found in database for userId:', userId);
            }
          } else {
            console.log('❌ Auth check: Invalid userId from OAuth token:', token.split('_')[0]);
          }
        }
        
        // Handle regular JWT tokens (format: userId_token)
        const userId = parseInt(token.split('_')[0]);
        
        if (!isNaN(userId)) {
          const user = await storage.getUser(userId);
          if (user) {
            console.log('🔍 Auth check: JWT user found:', user.username);
            // Don't send password in the response
            const { password, ...userWithoutPassword } = user;
            // Note: We still return deleted users here so frontend can handle display
            // But isAuthenticated middleware will block them from accessing resources
            return res.json(userWithoutPassword);
          } else {
            console.log('❌ Auth check: JWT user not found in database for userId:', userId);
          }
        } else {
          console.log('❌ Auth check: Invalid userId from JWT token:', token.split('_')[0]);
        }
      } else {
        console.log('❌ Auth check: No valid authorization header found');
      }
      
      // Fallback to session-based auth if token auth fails
      console.log('🔍 Auth check: Trying session authentication...');
      console.log('🔍 Session data:', req.session);
      console.log('🔍 Session userId:', req.session?.userId);
      
      if (!req.session?.userId) {
        console.log('❌ Auth check: No session userId found');
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        console.log('❌ Auth check: User not found for session userId:', req.session.userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log('🔍 Auth check: Session user found:', user.username);
      // Don't send password in the response
      const { password, ...userWithoutPassword } = user;
      // Note: We still return deleted users here so frontend can handle display
      // But isAuthenticated middleware will block them from accessing resources
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('❌ Auth check error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Middleware to check if user is authenticated
  const isAuthenticated = async (req: Request, res: Response, next: Function) => {
    try {
      // Check for token (bearer) authentication
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        console.log('🔍 Middleware: Token received:', token);
        
        if (token) {
          // Handle OAuth temporary tokens (format: userId_oauth_temp)
          if (token.includes('_oauth_temp')) {
            const userId = parseInt(token.split('_')[0]);
            console.log('🔍 Middleware: OAuth token detected, userId:', userId);
            
            if (!isNaN(userId)) {
              const user = await storage.getUser(userId);
              if (user) {
                console.log('🔍 Middleware: OAuth user found:', user.username);
                // Check if account is deleted
                if (user.deletedAt) {
                  return res.status(403).json({ 
                    message: 'This account has been deleted. Please recover it to continue.',
                    accountDeleted: true,
                    requiresRecovery: true
                  });
                }
                // Check if email is confirmed
                if (!user.emailConfirmed) {
                  return res.status(403).json({ 
                    message: 'Please confirm your email before accessing this resource.',
                    requiresEmailConfirmation: true,
                    email: user.email
                  });
                }
                req.user = user;
                return next();
              }
            }
          }
          
          // Handle regular JWT tokens (format: userId_token)
          const userId = parseInt(token.split('_')[0]);
          if (!isNaN(userId)) {
            const user = await storage.getUser(userId);
            if (user) {
              console.log('🔍 Middleware: JWT user found:', user.username);
              // Check if account is deleted
              if (user.deletedAt) {
                return res.status(403).json({ 
                  message: 'This account has been deleted. Please recover it to continue.',
                  accountDeleted: true,
                  requiresRecovery: true
                });
              }
              // Check if email is confirmed
              if (!user.emailConfirmed) {
                return res.status(403).json({ 
                  message: 'Please confirm your email before accessing this resource.',
                  requiresEmailConfirmation: true,
                  email: user.email
                });
              }
              req.user = user;
              return next();
            }
          }
        }
      }
      
      // Fall back to checking the session
      if (req.session && req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          // Check if account is deleted
          if (user.deletedAt) {
            return res.status(403).json({ 
              message: 'This account has been deleted. Please recover it to continue.',
              accountDeleted: true,
              requiresRecovery: true
            });
          }
          // Check if email is confirmed
          if (!user.emailConfirmed) {
            return res.status(403).json({ 
              message: 'Please confirm your email before accessing this resource.',
              requiresEmailConfirmation: true,
              email: user.email
            });
          }
          req.user = user;
          return next();
        }
      }
      
      // Debug logging for authentication issues
      console.log('Authentication failed - Session:', req.session?.userId, 'Auth header:', authHeader);
      
      res.status(401).json({ message: 'Authentication required' });
    } catch (error) {
      console.error('Auth error:', error);
      res.status(401).json({ message: 'Authentication error' });
    }
  };

  // Middleware to check if user has confirmed RSVP status for a trip
  const requireConfirmedRSVP = async (req: Request, res: Response, next: Function) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      let tripId = parseInt(req.params.id || req.params.tripId);
      
      // For activity routes, we need to get the tripId from the activity
      if (req.path.includes('/activities/') && !isNaN(parseInt(req.params.id))) {
        const activityId = parseInt(req.params.id);
        const activity = await storage.getActivity(activityId);
        if (!activity) {
          return res.status(404).json({ message: 'Activity not found' });
        }
        tripId = activity.tripId;
      }
      
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }

      const members = await storage.getTripMembers(tripId);
      const member = members.find(m => m.userId === user.id);

      if (!member) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }

      // Allow organizer regardless of RSVP status
      const trip = await storage.getTrip(tripId);
      if (trip?.organizer === user.id) {
        return next();
      }

      // Check RSVP status
      if (member.rsvpStatus !== 'confirmed') {
        return res.status(403).json({ 
          message: 'RSVP confirmation required', 
          rsvpStatus: member.rsvpStatus,
          requiresRSVP: true 
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Get deletion status endpoint
  router.get('/user/deletion-status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const deletionInProgress = await (storage as any).getDeletionInProgress(userId);
      res.json({ deletionInProgress });
    } catch (error) {
      console.error('Error getting deletion status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update deletion status endpoint (for canceling deletion)
  router.put('/user/deletion-status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const { deletionInProgress } = req.body;
      if (typeof deletionInProgress !== 'boolean') {
        return res.status(400).json({ message: 'deletionInProgress must be a boolean' });
      }

      const success = await (storage as any).setDeletionInProgress(userId, deletionInProgress);
      if (success) {
        res.json({ message: 'Deletion status updated successfully', deletionInProgress });
      } else {
        res.status(500).json({ message: 'Failed to update deletion status' });
      }
    } catch (error) {
      console.error('Error updating deletion status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Delete user account endpoint (now uses anonymization)
  router.delete('/auth/delete-account', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      console.log('🔍 Delete account request - userId:', userId);
      console.log('🔍 Delete account request - user object:', req.user);
      
      if (!userId) {
        console.log('❌ Delete account - No userId found');
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Check if user exists before attempting deletion
      const userExists = await storage.getUser(userId);
      console.log('🔍 Delete account - User exists check:', !!userExists);
      
      if (!userExists) {
        console.log('❌ Delete account - User not found in database');
        return res.status(404).json({ message: 'User not found' });
      }

      // Check deletion in progress status
      const deletionInProgress = await (storage as any).getDeletionInProgress(userId);
      console.log('🔍 Delete account - Deletion in progress:', deletionInProgress);

      // Check for unsettled balances across all trips
      console.log('🔍 Delete account - Checking for unsettled balances...');
      const tripsWithBalances = await (storage as any).getTripsWithUnsettledBalances(userId);
      
      // If deletion not in progress, set it and return trips with balances
      if (!deletionInProgress) {
        console.log('🔍 Delete account - Setting deletion in progress to true');
        await (storage as any).setDeletionInProgress(userId, true);
        
        return res.status(200).json({ 
          message: 'Deletion process started. Please settle all balances.',
          tripsWithBalances: tripsWithBalances,
          deletionInProgress: true
        });
      }

      // If deletion in progress, check if balances are settled
      // User can delete if all balances are >= 0 (they can leave even if owed money)
      const hasNegativeBalances = tripsWithBalances.some(trip => trip.balance < 0);
      
      if (hasNegativeBalances) {
        console.log('❌ Delete account - User still has negative balances');
        return res.status(400).json({ 
          message: 'You cannot delete your account until you settle all debts (negative balances).',
          tripsWithBalances: tripsWithBalances
        });
      }

      // All clear - proceed with deletion
      console.log('🔍 Delete account - No negative balances, starting user anonymization process...');
      // Use anonymizeUserAccount which handles trip organizer transfer and anonymization
      const success = await (storage as any).anonymizeUserAccount(userId);
      console.log('🔍 Delete account - Anonymization result:', success);
      
      if (success) {
        console.log('✅ Delete account - User anonymized successfully');
        // Destroy the session
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        
        return res.json({ message: 'Account deleted successfully. You can recover it by logging in again.' });
      } else {
        console.log('❌ Delete account - Anonymization failed');
        return res.status(500).json({ message: 'Failed to delete user' });
      }
    } catch (error) {
      console.error('❌ Delete account - Error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Trip Routes
  router.post('/trips', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      
      // Convert string dates to Date objects before validation
      const data = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      
      const tripData = insertTripSchema.parse(data);
      
      // Ensure the authenticated user is the organizer
      if (tripData.organizer !== user.id) {
        return res.status(403).json({ message: 'You can only create trips as yourself' });
      }
      
      // Provide default dates if not provided (database requires notNull dates)
      // Set to 1 year from now so they can be edited later
      const defaultStartDate = tripData.startDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const defaultEndDate = tripData.endDate || new Date(defaultStartDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week after start
      
      // Set removalLogicVersion to 2 for new trips to enable enhanced removal system
      const tripWithEnhancedRemoval = {
        ...tripData,
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        removalLogicVersion: 2
      };
      
      const trip = await storage.createTrip(tripWithEnhancedRemoval);
      
      // Automatically add the organizer as a confirmed member with full access
      await storage.addTripMember({
        tripId: trip.id,
        userId: user.id,
        status: 'confirmed',
        rsvpStatus: 'confirmed',
        paymentStatus: 'not_required', // Organizers never need to pay
        paymentAmount: null
      });
      
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid trip data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser

      console.log("Authenticated user:", user.id);
      
      const trips = await storage.getTripsByUser(user.id);
      console.log("Trips found for user:", trips);

      const tripMemberships = await storage.getTripMembershipsByUser(user.id);
      console.log("Trip memberships for user:", tripMemberships);

      
      // Filter trips to only include those where user has confirmed RSVP status OR is the organizer
      const confirmedTrips = trips.filter(trip => {
        const membership = tripMemberships.find(m => m.tripId === trip.id);
        // Include if user is organizer OR has confirmed RSVP status
        return (trip.organizer === user.id) || (membership && membership.rsvpStatus === 'confirmed');
      });
      
      // Fetch member counts and user settings for each trip
      const tripsWithMemberCounts = await Promise.all(confirmedTrips.map(async (trip) => {
        const members = await storage.getTripMembers(trip.id);
        // Count only confirmed members with confirmed RSVP status
        const confirmedMembers = members.filter(member => 
          member.status === 'confirmed' && member.rsvpStatus === 'confirmed'
        );
        
        // Get user-specific settings for this trip
        const settings = await storage.getUserTripSettings(user.id, trip.id);
        
        // Get the membership status for this trip
        const membership = tripMemberships.find(m => m.tripId === trip.id);
        
        const now = new Date();
        const ended = trip.endDate ? new Date(trip.endDate) < now : false;
        return {
          ...trip,
          memberCount: confirmedMembers.length,
          totalMembers: members.length,
          confirmedMembers: confirmedMembers.map(m => m.userId),
          isPinned: settings?.isPinned || false,
          // Consider trips whose endDate has passed as archived for display
          isArchived: Boolean(settings?.isArchived) || ended,
          memberStatus: membership?.status || 'none'
        };
      }));
      
      // Sort by start date (ascending - earliest first), ignoring end date
      tripsWithMemberCounts.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateA - dateB;
      });
      
      res.json(tripsWithMemberCounts);
    } catch (error) {
      console.error("Error fetching trips with member counts:", error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get trips where user has pending RSVP status
  router.get('/trips/rsvp/pending', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripMemberships = await storage.getTripMembershipsByUser(user.id);
      
      // Filter to only pending RSVP status trips
      const pendingRSVPMemberships = tripMemberships.filter(membership => 
        membership.rsvpStatus === 'pending'
      );
      
      // Get trip details for pending RSVP trips
      const pendingTrips = await Promise.all(
        pendingRSVPMemberships.map(async (membership) => {
          const trip = await storage.getTrip(membership.tripId);
          if (!trip) return null;
          
          return {
            ...trip,
            membershipStatus: membership.status,
            rsvpStatus: membership.rsvpStatus,
            joinedAt: membership.joinedAt
          };
        })
      );
      
      // Filter out null trips and return
      const validPendingTrips = pendingTrips.filter(trip => trip !== null);
      res.json(validPendingTrips);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get pending memberships with full details (for home page pending invitations)
  router.get('/trips/memberships/pending', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripMemberships = await storage.getTripMembershipsByUser(user.id);
      
      // Get pending memberships with full trip and organizer details
      const pendingMemberships = await Promise.all(
        tripMemberships
          .filter(membership => membership.rsvpStatus === 'pending')
          .map(async (membership) => {
            const trip = await storage.getTrip(membership.tripId);
            if (!trip) return null;
            
            // Get organizer details
            const organizer = await storage.getUser(trip.organizer);
            const { password: _, ...organizerWithoutPassword } = organizer || {};
            
            return {
              membership: {
                tripId: membership.tripId,
                userId: membership.userId,
                status: membership.status,
                rsvpStatus: membership.rsvpStatus,
                joinedAt: membership.joinedAt,
                paymentStatus: membership.paymentStatus,
                paymentAmount: membership.paymentAmount,
                paymentMethod: membership.paymentMethod
              },
              trip: {
                id: trip.id,
                name: trip.name,
                destination: trip.destination,
                startDate: trip.startDate,
                endDate: trip.endDate,
                description: trip.description,
                requiresDownPayment: trip.requiresDownPayment,
                downPaymentAmount: trip.downPaymentAmount
              },
              organizer: organizerWithoutPassword
            };
          })
      );
      
      res.json(pendingMemberships.filter(Boolean));
    } catch (error) {
      console.error('Error fetching pending memberships:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.put('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if this is a pin/archive action
      if (req.body.isPinned !== undefined || req.body.isArchived !== undefined) {
        // Any member can pin or archive a trip for their own view
        const memberships = await storage.getTripMembershipsByUser(user.id);
        const isMember = memberships.some(m => m.tripId === tripId);
        
        if (!isMember && trip.organizer !== user.id) {
          return res.status(403).json({ message: 'You must be a member of this trip to pin or archive it' });
        }
        
        // Create or update user-specific trip settings instead of updating the trip itself
        try {
          // Get existing settings or create default values
          const settings = await storage.getUserTripSettings(user.id, tripId) || { 
            userId: user.id, 
            tripId: tripId,
            isPinned: false,
            isArchived: false
          };
          
          // Update with new values
          const updatedSettings = {
            ...settings,
            isPinned: req.body.isPinned !== undefined ? req.body.isPinned : settings.isPinned,
            isArchived: req.body.isArchived !== undefined ? req.body.isArchived : settings.isArchived
          };
          
          // Save user trip settings
          await storage.createOrUpdateUserTripSettings(updatedSettings);
          
          // Return the trip with the user settings applied
          const updatedTrip = {
            ...trip,
            isPinned: updatedSettings.isPinned,
            isArchived: updatedSettings.isArchived
          };
          
          res.json(updatedTrip);
          return;
        } catch (error) {
          console.error("Error updating user trip settings:", error);
          return res.status(500).json({ message: 'Failed to update trip settings' });
        }
      }
      
      // For regular trip updates, only the organizer can make changes
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can update trip details' });
      }
      
      console.log('Received trip update data:', req.body);
      
      // Check if downpayment is being changed
      const isDownPaymentChanging = req.body.requiresDownPayment !== undefined || req.body.downPaymentAmount !== undefined;
      const newRequiresDownPayment = req.body.requiresDownPayment !== undefined ? req.body.requiresDownPayment : trip.requiresDownPayment;
      const newDownPaymentAmount = req.body.downPaymentAmount !== undefined ? req.body.downPaymentAmount : trip.downPaymentAmount;
      const wasRequiringDownPayment = trip.requiresDownPayment || false;
      const wasDownPaymentAmount = trip.downPaymentAmount || null;
      
      // If downpayment is being changed/removed, check for settlements
      if (isDownPaymentChanging && (wasRequiringDownPayment || newRequiresDownPayment)) {
        const settlements = await storage.getSettlementsByTrip(tripId);
        if (settlements.length > 0) {
          // Check if user explicitly confirmed the change
          if (!req.body.confirmDownPaymentChange) {
            return res.status(400).json({ 
              message: 'Cannot change down payment settings because settlements exist for this trip. This would corrupt financial records. Please confirm this change explicitly.',
              requiresConfirmation: true,
              hasSettlements: true
            });
          }
        }
      }
      
      // Convert string dates to Date objects before validation
      const bodyWithDates = {
        ...req.body,
        ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
        ...(req.body.endDate && { endDate: new Date(req.body.endDate) })
      };
      
      const tripData = insertTripSchema.partial().parse(bodyWithDates);
      console.log('Parsed trip data:', tripData);
      
      // Handle downpayment expense creation/deletion before updating trip
      if (isDownPaymentChanging) {
        // Get all trip members
        const allMembers = await storage.getTripMembers(tripId);
        // Get confirmed members (excluding organizer)
        const confirmedMembers = allMembers.filter(m => 
          m.rsvpStatus === 'confirmed' && m.userId !== trip.organizer
        );
        
        // Find existing downpayment expenses
        const allExpenses = await storage.getExpensesByTrip(tripId);
        const downPaymentExpenses = allExpenses.filter(exp => 
          exp.title && exp.title.toLowerCase().includes('down payment')
        );
        
        // Scenario: Removing downpayment
        if (wasRequiringDownPayment && !newRequiresDownPayment) {
          // Delete all downpayment expenses
          for (const expense of downPaymentExpenses) {
            await storage.deleteExpense(expense.id);
          }
          
          // Send notifications to confirmed members
          for (const member of confirmedMembers) {
            await storage.createNotification({
              userId: member.userId,
              type: 'downpayment_removed',
              title: 'Down Payment Removed',
              message: `The down payment requirement has been removed for ${trip.name}.`,
              data: { tripId, tripName: trip.name }
            });
          }
        }
        // Scenario: Adding downpayment
        else if (!wasRequiringDownPayment && newRequiresDownPayment && newDownPaymentAmount) {
          // Create expenses for each confirmed member
          for (const member of confirmedMembers) {
            const expense = await storage.createExpense({
              tripId,
              title: `Down Payment - ${trip.name}`,
              amount: newDownPaymentAmount.toString(),
              currency: 'USD',
              category: 'other',
              description: `Down payment required for ${trip.name}`,
              paidBy: trip.organizer,
              date: new Date()
            });
            
            // Create expense split - each member owes the full amount
            await storage.createExpenseSplit({
              expenseId: expense.id,
              userId: member.userId,
              amount: newDownPaymentAmount.toString()
            });
            
            // Send notification
            await storage.createNotification({
              userId: member.userId,
              type: 'downpayment_required',
              title: 'Down Payment Required',
              message: `A down payment of $${newDownPaymentAmount} is required for ${trip.name}.`,
              data: { tripId, tripName: trip.name, amount: newDownPaymentAmount }
            });
            
            // Update member payment info
            await storage.updateTripMemberPaymentInfo(tripId, member.userId, {
              paymentStatus: 'not_required',
              paymentAmount: newDownPaymentAmount.toString()
            });
          }
        }
        // Scenario: Updating downpayment amount
        else if (wasRequiringDownPayment && newRequiresDownPayment && newDownPaymentAmount && newDownPaymentAmount !== wasDownPaymentAmount) {
          // Update existing expenses or create new ones
          if (downPaymentExpenses.length > 0) {
            // Update existing expenses
            for (const expense of downPaymentExpenses) {
              // Update expense amount
              await db.update(expenses)
                .set({ 
                  amount: newDownPaymentAmount.toString(),
                  updatedAt: new Date()
                })
                .where(eq(expenses.id, expense.id));
              
              // Update expense splits
              await db.update(expenseSplits)
                .set({ amount: newDownPaymentAmount.toString() })
                .where(eq(expenseSplits.expenseId, expense.id));
            }
            
            // Send notifications to confirmed members
            for (const member of confirmedMembers) {
              await storage.createNotification({
                userId: member.userId,
                type: 'downpayment_updated',
                title: 'Down Payment Updated',
                message: `The down payment amount for ${trip.name} has been updated to $${newDownPaymentAmount}.`,
                data: { tripId, tripName: trip.name, amount: newDownPaymentAmount }
              });
              
              // Update member payment info
              await storage.updateTripMemberPaymentInfo(tripId, member.userId, {
                paymentAmount: newDownPaymentAmount.toString()
              });
            }
          } else {
            // No existing expenses, create new ones (same as adding)
            for (const member of confirmedMembers) {
              const expense = await storage.createExpense({
                tripId,
                title: `Down Payment - ${trip.name}`,
                amount: newDownPaymentAmount.toString(),
                currency: 'USD',
                category: 'other',
                description: `Down payment required for ${trip.name}`,
                paidBy: trip.organizer,
                date: new Date()
              });
              
              await storage.createExpenseSplit({
                expenseId: expense.id,
                userId: member.userId,
                amount: newDownPaymentAmount.toString()
              });
              
              await storage.createNotification({
                userId: member.userId,
                type: 'downpayment_required',
                title: 'Down Payment Required',
                message: `A down payment of $${newDownPaymentAmount} is required for ${trip.name}.`,
                data: { tripId, tripName: trip.name, amount: newDownPaymentAmount }
              });
              
              await storage.updateTripMemberPaymentInfo(tripId, member.userId, {
                paymentStatus: 'not_required',
                paymentAmount: newDownPaymentAmount.toString()
              });
            }
          }
        }
      }
      
      const updatedTrip = await storage.updateTrip(tripId, tripData);
      
      res.json(updatedTrip);
    } catch (error: any) {
      console.error('Error in PUT /api/trips/:id:', error);
      res.status(500).json({ message: error?.message || 'Server error', error });
    }
  });

  // Update admin-only itinerary setting
  router.patch('/trips/:id/admin-settings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is an admin of this trip
      const members = await storage.getTripMembers(tripId);
      const currentMember = members.find(m => m.userId === user.id);
      
      if (!currentMember?.isAdmin) {
        return res.status(403).json({ message: 'Only trip admins can modify admin settings' });
      }

      const { adminOnlyItinerary } = req.body;
      if (typeof adminOnlyItinerary !== 'boolean') {
        return res.status(400).json({ message: 'adminOnlyItinerary must be a boolean' });
      }

      const updatedTrip = await storage.updateTrip(tripId, { adminOnlyItinerary });
      res.json(updatedTrip);
    } catch (error) {
      console.error('Error updating admin settings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.delete('/trips/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      //adding this comment so that i can commit 
      // Only organizer can delete trip
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can delete the trip' });
      }
      
      // Check for unsettled balances (same check as leave trip)
      const dbStorage = storage as any;
      if (typeof dbStorage.analyzeMemberRemovalEligibility === 'function') {
        const eligibility = await dbStorage.analyzeMemberRemovalEligibility(tripId, user.id);
        
        if (!eligibility.canRemove) {
          return res.status(400).json({ 
            message: eligibility.reason || 'Cannot delete trip due to unsettled balances',
            balance: eligibility.balance,
            manualExpenseBalance: eligibility.manualExpenseBalance,
            prepaidActivityBalance: eligibility.prepaidActivityBalance,
            prepaidActivitiesOwed: eligibility.prepaidActivitiesOwed,
            suggestions: eligibility.suggestions
          });
        }
      }
      
      await storage.deleteTrip(tripId);
      res.json({ message: 'Trip deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Trip Members Routes
  router.post('/trips/:id/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can add members
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only the trip organizer can add members' });
      }
      
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      
      const userToAdd = await storage.getUserByUsername(username);
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is already a member
      const members = await storage.getTripMembers(tripId);
      const existingMember = members.find(member => member.userId === userToAdd.id);
      
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this trip' });
      }
      
      // Initialize payment status based on trip requirements
      const paymentStatus = trip.requiresDownPayment ? 'not_required' : 'not_required';
      
      const member = await storage.addTripMember({
        tripId,
        userId: userToAdd.id,
        status: 'pending',
        rsvpStatus: 'pending', // New invitations default to pending RSVP
        paymentStatus,
        paymentAmount: trip.requiresDownPayment ? trip.downPaymentAmount?.toString() : null
      });
      
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id/members', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      // Get detailed info about each member including payment information
      const membersWithDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return null;
          
          const { password, ...userWithoutPassword } = user;
          return {
            ...member,
            user: userWithoutPassword,
            // Ensure payment fields are included
            paymentMethod: member.paymentMethod,
            paymentStatus: member.paymentStatus,
            paymentAmount: member.paymentAmount,
            paymentSubmittedAt: member.paymentSubmittedAt,
            paymentConfirmedAt: member.paymentConfirmedAt
          };
        })
      );
      
      res.json(membersWithDetails.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Check member removal eligibility (enhanced version 2+ logic)
  router.get('/trips/:tripId/members/:userId/removal-eligibility', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Get trip and verify admin access
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const members = await storage.getTripMembers(tripId);
      const currentMember = members.find(m => m.userId === user.id);
      
      // Allow if:
      // 1. User is checking their own eligibility (for leaving trip)
      // 2. User is admin/organizer (for removing other members)
      const isCheckingSelf = user.id === userId;
      const isAdmin = currentMember?.isAdmin || trip.organizer === user.id;
      
      if (!isCheckingSelf && !isAdmin) {
        return res.status(403).json({ message: 'You can only check your own eligibility or must be an admin' });
      }
      
      const eligibility = await storage.analyzeMemberRemovalEligibility(tripId, userId);
      res.json(eligibility);
      
    } catch (error) {
      console.error('Error checking removal eligibility:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Remove member from trip with content handling options
  router.delete('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userIdToRemove = parseInt(req.params.userId);
      const { removeActivities = false, removeExpenses = false } = req.body;
      
      if (isNaN(tripId) || isNaN(userIdToRemove)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Get trip details
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Get all members to check permissions
      const members = await storage.getTripMembers(tripId);
      const currentUserMember = members.find(m => m.userId === user.id);
      const memberToRemove = members.find(m => m.userId === userIdToRemove);
      
      if (!currentUserMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      if (!memberToRemove) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Check if current user is admin (organizer or has admin privileges)
      const isCurrentUserAdmin = currentUserMember.userId === trip.organizer || currentUserMember.isAdmin;
      
      if (!isCurrentUserAdmin) {
        return res.status(403).json({ message: 'Only admins can remove members' });
      }
      
      // Cannot remove the organizer
      if (userIdToRemove === trip.organizer) {
        return res.status(403).json({ message: 'Cannot remove the trip organizer' });
      }
      
      // Cannot remove yourself
      if (userIdToRemove === user.id) {
        return res.status(403).json({ message: 'Cannot remove yourself from the trip' });
      }
      
      // Check if this is the last admin (excluding organizer)
      const adminCount = members.filter(m => m.isAdmin || m.userId === trip.organizer).length;
      const isLastAdmin = adminCount <= 1 && memberToRemove.isAdmin;
      
      if (isLastAdmin) {
        return res.status(403).json({ message: 'Cannot remove the last admin from the trip' });
      }
      
      // Handle activities if requested
      if (removeActivities) {
        const activities = await storage.getActivitiesByTrip(tripId);
        const userActivities = activities.filter(activity => activity.createdBy === userIdToRemove);
        
        for (const activity of userActivities) {
          await storage.deleteActivity(activity.id);
        }
      } else {
        // Keep activities but remove user's RSVP and mark as created by removed user
        const activities = await storage.getActivitiesByTrip(tripId);
        const userActivities = activities.filter(activity => activity.createdBy === userIdToRemove);
        
        for (const activity of userActivities) {
          // Remove user's RSVP
          const rsvps = await storage.getActivityRSVPs(activity.id);
          const userRSVP = rsvps.find(rsvp => rsvp.userId === userIdToRemove);
          if (userRSVP) {
            await storage.updateActivityRSVP(activity.id, userIdToRemove, 'declined');
          }
          
          // Mark activity as created by removed user - set to organizer instead of invalid user
          await storage.updateActivity(activity.id, {
            name: `${activity.name} (Created by removed user)`,
            createdBy: trip.organizer // Assign to organizer instead of invalid ID
          });
        }
      }
      
      // Handle expenses if requested
      if (removeExpenses) {
        const expenses = await storage.getExpensesByTrip(tripId);
        const userExpenses = expenses.filter(expense => expense.submittedBy === userIdToRemove);
        
        for (const expense of userExpenses) {
          // First remove all expense splits for this expense
          await storage.removeExpenseSplits(expense.id);
          // Then delete the expense itself
          await storage.deleteExpense(expense.id);
        }
      } else {
        // Keep expenses but mark as submitted by removed user
        const expenses = await storage.getExpensesByTrip(tripId);
        const userExpenses = expenses.filter(expense => expense.submittedBy === userIdToRemove);
        
        for (const expense of userExpenses) {
          await storage.updateExpense(expense.id, {
            description: `${expense.description} (Submitted by removed user)`,
            submittedBy: trip.organizer // Assign to organizer instead of invalid ID
          });
        }
      }
      
      // DO NOT remove user from expense splits - this would alter financial history
      // and change other users' balances. Instead, we preserve all financial records
      // and only remove the user from membership/RSVPs.
      
      // Remove the member from the trip
      const removed = await storage.removeTripMember(tripId, userIdToRemove);
      
      if (!removed) {
        return res.status(500).json({ message: 'Failed to remove member' });
      }
      
      res.json({ 
        message: 'Member removed successfully',
        removedActivities: removeActivities,
        removedExpenses: removeExpenses
      });
      
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Leave trip (self-removal endpoint)
  router.post('/trips/:tripId/leave', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Get trip details
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Get all members to check membership and permissions
      const members = await storage.getTripMembers(tripId);
      const currentUserMember = members.find(m => m.userId === user.id);
      
      if (!currentUserMember) {
        return res.status(403).json({ message: 'You are not a member of this trip' });
      }
      
      // Cannot leave if you are the organizer
      if (user.id === trip.organizer) {
        return res.status(403).json({ 
          message: 'Trip organizer cannot leave the trip. Please transfer organizer role first or delete the trip.' 
        });
      }
      
      // Check for unsettled balances
      const dbStorage = storage as any;
      if (typeof dbStorage.analyzeMemberRemovalEligibility === 'function') {
        const eligibility = await dbStorage.analyzeMemberRemovalEligibility(tripId, user.id);
        
        if (!eligibility.canRemove) {
          return res.status(400).json({ 
            message: eligibility.reason || 'Cannot leave trip due to unsettled balances',
            balance: eligibility.balance,
            manualExpenseBalance: eligibility.manualExpenseBalance,
            prepaidActivityBalance: eligibility.prepaidActivityBalance,
            prepaidActivitiesOwed: eligibility.prepaidActivitiesOwed,
            suggestions: eligibility.suggestions
          });
        }
      }
      
      // Handle user's activities - decline RSVPs
      const activities = await storage.getActivitiesByTrip(tripId);
      const userActivities = activities.filter(activity => activity.createdBy === user.id);
      
      for (const activity of userActivities) {
        // Remove user's RSVP
        const rsvps = await storage.getActivityRSVPs(activity.id);
        const userRSVP = rsvps.find(rsvp => rsvp.userId === user.id);
        if (userRSVP) {
          await storage.updateActivityRSVP(activity.id, user.id, 'declined');
        }
        
        // Mark activity as created by leaving user - assign to organizer
        await storage.updateActivity(activity.id, {
          name: `${activity.name} (Created by ${user.name || user.username})`,
          createdBy: trip.organizer
        });
      }
      
      // Handle user's expenses - mark as submitted by leaving user
      const expenses = await storage.getExpensesByTrip(tripId);
      const userExpenses = expenses.filter(expense => expense.submittedBy === user.id);
      
      for (const expense of userExpenses) {
        await storage.updateExpense(expense.id, {
          description: `${expense.description} (Submitted by ${user.name || user.username})`,
          submittedBy: trip.organizer
        });
      }
      
      // DO NOT remove user from expense splits - preserves financial history
      
      // Remove the member from the trip
      const removed = await storage.removeTripMember(tripId, user.id);
      
      if (!removed) {
        return res.status(500).json({ message: 'Failed to leave trip' });
      }
      
      // Broadcast to remaining members that user has left
      broadcastToTrip(wss, tripId, {
        type: 'MEMBER_LEFT',
        data: { 
          userId: user.id,
          userName: user.name || user.username,
          tripId 
        }
      });
      
      res.json({ 
        message: 'Successfully left the trip',
        tripId
      });
      
    } catch (error) {
      console.error('Error leaving trip:', error);
      const errorMessage = error instanceof Error ? error.message : 'Server error';
      res.status(500).json({ message: errorMessage });
    }
  });
  
  // Get travel companions from past trips (for suggestions)
  router.get('/trips/:id/past-companions', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Get all trips this user has been a part of
      const userTrips = await storage.getTripsByUser(user.id);
      
      // Include all trips that the user is part of except the current one
      // We want to show all travel connections, not just past trips
      const relevantTrips = userTrips.filter(trip => trip.id !== tripId);
      
      // Get all members from those relevant trips
      const companionsMap = new Map();
      
      await Promise.all(relevantTrips.map(async (trip) => {
        const tripMembers = await storage.getTripMembers(trip.id);
        
        // Include all members who aren't the current user (not just confirmed members)
        for (const member of tripMembers.filter(m => m.userId !== user.id)) {
          // Get the user details for this member
          const memberUser = await storage.getUser(member.userId);
          if (memberUser) {
            if (!companionsMap.has(member.userId)) {
              companionsMap.set(member.userId, {
                userId: member.userId,
                user: memberUser,
                tripCount: 1,
                lastTripName: trip.name,
                lastTripDate: trip.endDate
              });
            } else {
              const companion = companionsMap.get(member.userId);
              companion.tripCount += 1;
              
              // Update last trip if this one is more recent
              const existingDate = new Date(companion.lastTripDate);
              const newDate = new Date(trip.endDate);
              if (newDate > existingDate) {
                companion.lastTripName = trip.name;
                companion.lastTripDate = trip.endDate;
              }
            }
          }
        }
      }));
      
      // Convert map to array and sort by trip count (most frequent companions first)
      const companions = Array.from(companionsMap.values())
        .sort((a, b) => b.tripCount - a.tripCount);
      
      res.json(companions);
    } catch (error) {
      console.error('Error fetching past companions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.put('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }
      
      // If user is updating their own status, they must be a member
      // If user is updating someone else's status, they must be the organizer
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const isOrganizer = trip.organizer === user.id;
      const isUpdatingSelf = userId === user.id;
      
      if (!isOrganizer && !isUpdatingSelf) {
        return res.status(403).json({ message: 'Not authorized to update this member' });
      }
      
      const { status } = req.body;
      if (!status || !['pending', 'confirmed', 'declined'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // If not self-update and not organizer, only allow confirming or declining own invitation
      if (isUpdatingSelf && !isOrganizer && status !== 'confirmed' && status !== 'declined') {
        return res.status(403).json({ message: 'Can only confirm or decline your own invitation' });
      }
      
      // Handle "cannot attend" responses - remove member and archive trip for them
      if (status === 'declined') {
        // Archive the trip for this user before removing them
        await storage.createOrUpdateUserTripSettings({
          userId,
          tripId,
          isPinned: false,
          isArchived: true}
        );
        
        // Remove the user from the trip
        const removed = await storage.removeTripMember(tripId, userId);
        if (!removed) {
          return res.status(404).json({ message: 'Member not found' });
        }
        
        res.json({ message: 'You have been removed from the trip', status: 'declined' });
      } else {
        const updatedMember = await storage.updateTripMemberStatus(tripId, userId, status);
        if (!updatedMember) {
          return res.status(404).json({ message: 'Member not found' });
        }
        
        res.json(updatedMember);
      }
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update trip member RSVP status (no RSVP requirement for this endpoint)
  router.put('/trips/:tripId/members/:userId/rsvp', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      const { rsvpStatus } = req.body;
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      if (!['pending', 'confirmed', 'declined', 'maybe'].includes(rsvpStatus)) {
        return res.status(400).json({ message: 'Invalid RSVP status' });
      }
      
      // Only the user themselves can update their RSVP status
      if (userId !== user.id) {
        return res.status(403).json({ message: 'You can only update your own RSVP status' });
      }
      
      // First check if the user is actually a member of the trip
      const existingMember = await storage.getTripMember(tripId, userId);
      if (!existingMember) {
        return res.status(404).json({ 
          message: 'Trip member not found',
          details: `User ${userId} is not a member of trip ${tripId}`
        });
      }
      
      const updatedMember = await storage.updateTripMemberRSVPStatus(tripId, userId, rsvpStatus);
      
      if (!updatedMember) {
        return res.status(404).json({ message: 'Failed to update trip member RSVP status' });
      }
      
      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating trip member RSVP status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // RSVP Payment Routes
  router.post('/trips/:tripId/members/:userId/payment', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      const { paymentMethod } = req.body;
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only the user themselves can submit payment
      if (userId !== user.id) {
        return res.status(403).json({ message: 'You can only submit payment for yourself' });
      }
      
      if (!['venmo', 'paypal', 'cash'].includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      
      // Get trip details to check payment requirements
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (!trip.requiresDownPayment) {
        return res.status(400).json({ message: 'This trip does not require down payment' });
      }
      
      // Update member with payment info
      const updatedMember = await storage.updateTripMemberPaymentInfo(tripId, userId, {
        paymentMethod,
        paymentStatus: 'pending',  // Always set to pending until organizer confirms
        paymentAmount: trip.downPaymentAmount?.toString(),
        paymentSubmittedAt: new Date()
      });
      
      // Update RSVP status to pending until organizer confirms payment
      await storage.updateTripMemberRSVPStatus(tripId, userId, 'pending');
      
      res.json({ message: 'Payment submitted successfully', member: updatedMember });
    } catch (error) {
      console.error('Error submitting payment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:tripId/members/:userId/confirm-payment', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only trip organizer can confirm payments
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only trip organizer can confirm payments' });
      }
      
      // Update payment status and RSVP status
      await storage.updateTripMemberPaymentInfo(tripId, userId, {
        paymentStatus: 'confirmed',
        paymentConfirmedAt: new Date()
      });
      
      await storage.updateTripMemberRSVPStatus(tripId, userId, 'confirmed');
      
      // Update the main status to confirmed to grant full access
      await storage.updateTripMemberStatus(tripId, userId, 'confirmed');
      
      res.json({ message: 'Payment confirmed successfully' });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:tripId/members/:userId/reject-payment', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only trip organizer can reject payments
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only trip organizer can reject payments' });
      }
      
      // Update payment status and RSVP status to declined
      await storage.updateTripMemberPaymentInfo(tripId, userId, {
        paymentStatus: 'rejected'
      });
      
      await storage.updateTripMemberRSVPStatus(tripId, userId, 'declined');
      
      // Update the main status to declined
      await storage.updateTripMemberStatus(tripId, userId, 'declined');
      
      res.json({ message: 'Payment rejected successfully' });
    } catch (error) {
      console.error('Error rejecting payment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:tripId/members/:userId/notify-rejection', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only trip organizer can send notifications
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only trip organizer can send notifications' });
      }
      
      // Get the member details
      const member = await storage.getTripMember(tripId, userId);
      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Get user details for email
      const userDetails = await storage.getUser(userId);
      if (!userDetails || !userDetails.email) {
        return res.status(404).json({ message: 'User email not found' });
      }
      
      // Send rejection notification email
      const { sendEmail } = await import('./email');
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Rejected - ${trip.name}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #044674; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; color: #000000; }
            .button { display: inline-block; background: #044674; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .notice { background: #fff8e1; border: 1px solid #ffe082; padding: 15px; border-radius: 5px; margin: 20px 0; color: #000000; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
              <div>
                <h1 style="margin: 0;">Navigator</h1>
                <p style="margin: 0;">The world is Waiting</p>
              </div>
            </div>
          </div>
      
          <div class="content">
            <h2>Hello ${userDetails.name || userDetails.username},</h2>
            <p>We wanted to let you know that your payment for <strong>${trip.name}</strong> has been rejected by the trip organizer.</p>
            
            <div class="notice">
              <strong>What this means:</strong>
              <ul>
                <li>Your payment was not accepted for this trip</li>
                <li>You are no longer confirmed to attend</li>
                <li>You can resubmit a payment if you'd like to try again</li>
              </ul>
            </div>
            
            <p>If you have any questions about this decision, please contact the trip organizer directly.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://navigatortrips.com'}/trips/${tripId}" class="button">
                View Trip Details
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Navigator. Please do not reply to this email.</p>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail(
        userDetails.email,
        `Payment Rejected - ${trip.name}`,
        emailHtml
      );
      
      res.json({ message: 'Rejection notification sent successfully' });
    } catch (error) {
      console.error('Error sending rejection notification:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:tripId/members/:userId/allow-rejoin', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      // Only trip organizer can allow rejoin
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: 'Only trip organizer can allow rejoin' });
      }
      
      // Get the member details
      const member = await storage.getTripMemberWithPaymentInfo(tripId, userId);
      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      // Reset their status to allow rejoining
      await storage.updateTripMemberStatus(tripId, userId, 'pending');
      await storage.updateTripMemberRSVPStatus(tripId, userId, 'pending');
      
      // Reset payment status
      await storage.updateTripMemberPaymentInfo(tripId, userId, {
        paymentStatus: trip.requiresDownPayment ? 'not_required' : 'not_required',
        paymentMethod: null,
        paymentAmount: trip.requiresDownPayment ? trip.downPaymentAmount?.toString() : null,
        paymentSubmittedAt: null,
        paymentConfirmedAt: null
      });
      
      res.json({ message: 'User can now rejoin the trip' });
    } catch (error) {
      console.error('Error allowing rejoin:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.delete('/trips/:tripId/members/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }
      
      // Only organizer can remove members (besides themselves)
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const isOrganizer = trip.organizer === user.id;
      const isRemovingSelf = userId === user.id;
      
      if (!isOrganizer && !isRemovingSelf) {
        return res.status(403).json({ message: 'Not authorized to remove this member' });
      }
      
      // Organizer cannot remove themselves - they must delete the trip instead
      if (isRemovingSelf && isOrganizer) {
        return res.status(400).json({ message: 'Trip organizer cannot leave. You must delete the trip or transfer ownership first.' });
      }
      
      const success = await storage.removeTripMember(tripId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Member not found' });
      }
      
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update member admin status
  router.patch('/trips/:tripId/members/:userId/admin', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      const { isAdmin } = req.body;
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid trip ID or user ID' });
      }
      
      if (typeof isAdmin !== 'boolean') {
        return res.status(400).json({ message: 'isAdmin must be a boolean value' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is admin (organizer or has admin flag)
      const members = await storage.getTripMembers(tripId);
      const currentUserMember = members.find(member => member.userId === user.id);
      const isCurrentUserAdmin = currentUserMember?.isAdmin || trip.organizer === user.id;
      
      if (!isCurrentUserAdmin) {
        return res.status(403).json({ message: 'Only trip admins can modify admin access' });
      }
      
      // Don't allow changing organizer's admin status
      if (trip.organizer === userId) {
        return res.status(400).json({ message: 'Cannot modify organizer admin status' });
      }
      
      // If demoting, ensure at least one admin remains
      if (!isAdmin) {
        const adminCount = members.filter(member => member.isAdmin || member.userId === trip.organizer).length;
        const targetMember = members.find(member => member.userId === userId);
        
        if (adminCount <= 1 && (targetMember?.isAdmin || userId === trip.organizer)) {
          return res.status(400).json({ message: 'At least one admin is required per trip' });
        }
      }
      
      const updatedMember = await storage.updateTripMemberAdminStatus(tripId, userId, isAdmin);
      if (!updatedMember) {
        return res.status(404).json({ message: 'Trip member not found' });
      }
      
      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating member admin status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Activity Routes
  
  // Preview endpoint for activities (no authentication required - limited data only)
  router.get('/trips/:id/activities/preview', async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      const activities = await storage.getActivitiesByTrip(tripId);
      
      // Return preview data only (no sensitive information)
      const previewActivities = activities.map(activity => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        date: activity.date,
        location: activity.location,
        duration: activity.duration,
        cost: activity.cost
      }));
      
      res.json(previewActivities);
    } catch (error) {
      console.error('Error fetching activity preview:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/trips/:id/activities', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      console.log('Activity creation request received:', req.body);
      
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        console.log('Invalid trip ID');
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        console.log('Trip not found:', tripId);
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a confirmed member of the trip
      const members = await storage.getTripMembers(tripId);
      const currentMember = members.find(member => 
        member.userId === authUser.id && member.status === 'confirmed'
      );
      
      if (!currentMember) {
        console.log('User not a confirmed member:', authUser.id, tripId);
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }

      // Check admin-only itinerary permission
      if (trip.adminOnlyItinerary && !currentMember.isAdmin) {
        return res.status(403).json({ message: 'Only trip admins can add to the itinerary' });
      }
      
      try {
        // Convert date string to Date object and handle empty strings before validation
        const data = {
          ...req.body,
          tripId,
          date: req.body.date ? new Date(req.body.date) : undefined,
          duration: req.body.duration === '' ? null : req.body.duration || null,
          cost: req.body.cost === '' ? null : req.body.cost,
          checkInDate: req.body.checkInDate ? new Date(req.body.checkInDate) : null,
          checkOutDate: req.body.checkOutDate ? new Date(req.body.checkOutDate) : null,
          createdBy: authUser.id
        };
        
        console.log('Activity data before validation:', data);
        
        // Validate the activity data
        const activityData = insertActivitySchema.parse(data);
        console.log('Validated activity data:', activityData);
        
        // Create the activity
        const createdActivity = await storage.createActivity(activityData);
        console.log('Activity created:', createdActivity);
        
        // Auto-RSVP the creator as "going"
        await storage.createActivityRSVP({
          activityId: createdActivity.id,
          userId: authUser.id,
          status: 'going'
        });
        
        res.status(201).json(createdActivity);
      } catch (error) {
        console.error('Error creating activity:', error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ 
            message: 'Invalid activity data', 
            errors: error.errors 
          });
        }
        throw error; // Pass to outer catch block
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid activity data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id/activities', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const activities = await storage.getActivitiesByTrip(tripId);
      
      // For each activity, get the RSVPs and calculate counts
      const activitiesWithRsvps = await Promise.all(
        activities.map(async (activity) => {
          const rsvps = await storage.getActivityRSVPs(activity.id);
          const confirmedCount = rsvps.filter(rsvp => rsvp.status === 'going').length;
          // Count only confirmed members (people who are actually part of the trip)
          const confirmedMembers = members.filter(member => 
            member.status === 'confirmed' && member.rsvpStatus === 'confirmed'
          );
          const totalCount = confirmedMembers.length;
          
          // Get creator information
          let creator = null;
          if (activity.createdBy) {
            const creatorUser = await storage.getUser(activity.createdBy);
            if (creatorUser) {
              creator = {
                id: creatorUser.id,
                name: creatorUser.name || creatorUser.username || 'Unknown User',
                avatar: creatorUser.avatar
              };
            }
          }
          
          return {
            ...activity,
            rsvps,
            confirmedCount,
            totalCount,
            creator
          };
        })
      );
      
      res.json(activitiesWithRsvps);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.put('/activities/:id', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const activityId = parseInt(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Get trip and check permissions
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is a confirmed member
      const members = await storage.getTripMembers(activity.tripId);
      const currentMember = members.find(member => 
        member.userId === user.id && member.status === 'confirmed' && member.rsvpStatus === 'confirmed'
      );
      
      if (!currentMember) {
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }

      // Check admin-only itinerary permission
      if (trip.adminOnlyItinerary && !currentMember.isAdmin) {
        return res.status(403).json({ message: 'Only trip admins can edit the itinerary' });
      }
      
      const activityData = insertActivitySchema.partial().parse(req.body);
      const updatedActivity = await storage.updateActivity(activityId, activityData);
      
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid activity data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.delete('/activities/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const activityId = parseInt(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Get trip and check permissions
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is a confirmed member
      const members = await storage.getTripMembers(activity.tripId);
      const currentMember = members.find(member => 
        member.userId === user.id && member.status === 'confirmed' && member.rsvpStatus === 'confirmed'
      );
      
      if (!currentMember) {
        return res.status(403).json({ message: 'Not a confirmed member of this trip' });
      }

      // Check admin-only itinerary permission or if user is activity creator
      const isActivityCreator = activity.createdBy === user.id;
      if (trip.adminOnlyItinerary && !currentMember.isAdmin && !isActivityCreator) {
        return res.status(403).json({ message: 'Only trip admins can delete activities' });
      }
      
      // CRITICAL: Check for settlements before deleting activity (since it deletes associated expenses)
      const settlements = await storage.getSettlementsByTrip(activity.tripId);
      if (settlements.length > 0) {
        // Get all expenses associated with this activity
        const activityExpenses = await db
          .select()
          .from(expenses)
          .where(eq(expenses.activityId, activityId));
        
        if (activityExpenses.length > 0) {
          // Check if any of these expenses existed before settlements were created
          const oldestSettlement = Math.min(...settlements.map(s => new Date(s.createdAt).getTime()));
          
          for (const expense of activityExpenses) {
            const expenseCreatedAt = new Date(expense.createdAt).getTime();
            if (expenseCreatedAt < oldestSettlement) {
              return res.status(403).json({ 
                message: `Cannot delete this activity because it has expenses that were included in settlement calculations. Deleting activities with expenses that were part of settlements would corrupt the financial records and make balances inaccurate.` 
              });
            }
          }
          
          // Also check if there are confirmed settlements
          const confirmedSettlements = settlements.filter(s => s.status === 'confirmed');
          if (confirmedSettlements.length > 0) {
            return res.status(403).json({ 
              message: `Cannot delete this activity because confirmed settlements exist for this trip. Deleting activities with associated expenses would corrupt the financial records.` 
            });
          }
        }
      }
      
      const success = await storage.deleteActivity(activityId);
      if (!success) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Notify trip members about the deleted activity and any associated expenses
      broadcastToTrip(wss, activity.tripId, {
        type: 'DELETE_ACTIVITY',
        data: { id: activityId, tripId: activity.tripId }
      });
      
      res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Activity ownership transfer endpoint
  router.put('/activities/:id/transfer-ownership', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const activityId = parseInt(req.params.id);
      const { newOwnerId } = req.body;
      
      if (isNaN(activityId) || !newOwnerId || isNaN(newOwnerId)) {
        return res.status(400).json({ message: 'Invalid activity ID or new owner ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Get trip and check permissions
      const trip = await storage.getTrip(activity.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }

      // Check if user is admin or organizer
      const members = await storage.getTripMembers(activity.tripId);
      const currentMember = members.find(member => member.userId === user.id);
      const isAdminOrOrganizer = currentMember?.isAdmin || trip.organizer === user.id;
      
      if (!isAdminOrOrganizer) {
        return res.status(403).json({ message: 'Only trip admins and organizers can transfer activity ownership' });
      }

      // Verify new owner is a confirmed member of the trip
      const newOwnerMember = members.find(member => 
        member.userId === newOwnerId && member.status === 'confirmed'
      );
      
      if (!newOwnerMember) {
        return res.status(400).json({ message: 'New owner must be a confirmed member of the trip' });
      }
      
      const updatedActivity = await storage.transferActivityOwnership(activityId, newOwnerId);
      if (!updatedActivity) {
        return res.status(404).json({ message: 'Failed to transfer ownership' });
      }
      
      res.json({ 
        message: 'Activity ownership transferred successfully',
        activity: updatedActivity 
      });
    } catch (error) {
      console.error('Error transferring activity ownership:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Activity RSVP Routes
  router.post('/activities/:id/rsvp', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const activityId = parseInt(req.params.id);
      if (isNaN(activityId)) {
        return res.status(400).json({ message: 'Invalid activity ID' });
      }
      
      const activity = await storage.getActivity(activityId);
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }
      
      // Check if user is any member of the trip (allow all members to RSVP)
      const members = await storage.getTripMembers(activity.tripId);
      const isMember = members.some(member => 
        member.userId === user.id
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const { status } = req.body;
      if (!status || !['going', 'not going'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      // Check if RSVP already exists
      const rsvps = await storage.getActivityRSVPs(activityId);
      const existingRsvp = rsvps.find(rsvp => rsvp.userId === user.id);
      
      // Track the previous status for expense handling
      const previousStatus = existingRsvp?.status;
      
      // Check registration cap if user is trying to RSVP as "going"
      if (status === 'going' && activity.maxParticipants) {
        const currentGoingCount = rsvps.filter(rsvp => rsvp.status === 'going').length;
        
        // If user is already going, they can stay going (no cap check needed)
        // If user is not going or new, check if there's space
        if (!existingRsvp || existingRsvp.status !== 'going') {
          if (currentGoingCount >= activity.maxParticipants) {
            return res.status(400).json({ 
              message: `Activity is full. Maximum ${activity.maxParticipants} participants allowed.` 
            });
          }
        }
      }
      
      let rsvp;
      if (existingRsvp) {
        // Update existing RSVP
        rsvp = await storage.updateActivityRSVP(activityId, user.id, status);
      } else {
        // Create new RSVP
        rsvp = await storage.createActivityRSVP({
          activityId,
          userId: user.id,
          status
        });
      }

      // Handle expense updates for prepaid (group split) activities
      if (activity.paymentType === 'prepaid' && activity.cost && parseFloat(activity.cost) > 0) {
        try {
          const existingExpenses = await storage.getExpensesByTrip(activity.tripId);
          let existingActivityExpense = existingExpenses.find(expense => 
            expense.activityId === activityId
          );

          // If user is changing from "going" to "not going"
          if (status === 'not going' && previousStatus === 'going' && existingActivityExpense) {
            // Get current splits to check if expense is settled
            const currentSplits = await storage.getExpenseSplits(existingActivityExpense.id);
            const userSplit = currentSplits.find(split => split.userId === user.id);
            
            if (userSplit) {
              // Check if expense is settled (isSettled flag or has confirmed settlements)
              const isExpenseSettled = existingActivityExpense.isSettled;
              const settlements = await storage.getSettlementsByTrip(activity.tripId);
              const confirmedSettlements = settlements.filter(s => s.status === 'confirmed');
              const hasConfirmedSettlements = confirmedSettlements.length > 0;
              
              // Remove user's split from the expense
              await storage.removeUserFromExpenseSplit(existingActivityExpense.id, user.id);
              
              // Get updated RSVPs after the change (RSVP is already saved above)
              const updatedRsvps = await storage.getActivityRSVPs(activityId);
              const goingUserIds = updatedRsvps
                .filter(rsvp => rsvp.status === 'going')
                .map(rsvp => rsvp.userId);
              
              // Recalculate splits for remaining participants
              if (goingUserIds.length > 0) {
                const costPerPerson = parseFloat(activity.cost) / goingUserIds.length;
                
                // Remove all remaining splits and recreate with updated amounts
                await storage.removeExpenseSplits(existingActivityExpense.id);
                
                for (const userId of goingUserIds) {
                  await storage.createExpenseSplit({
                    expenseId: existingActivityExpense.id,
                    userId: userId,
                    amount: costPerPerson.toFixed(2)
                  });
                }
              } else {
                // No one is going anymore - remove all splits but keep expense for history
                // (especially if settled, to preserve financial records)
                await storage.removeExpenseSplits(existingActivityExpense.id);
              }
              
              // Note: If expense was settled, the user is now owed money
              // The balance calculation will automatically show they're owed their share
              // because they paid (expense.paidBy) but no longer have a split
            }
          }
          // If user is changing from "not going" to "going" or is new
          else if (status === 'going' && previousStatus !== 'going') {
            // Create expense if it doesn't exist
            if (!existingActivityExpense) {
              const activityCreatorId = activity.createdBy || user.id;
              
              existingActivityExpense = await storage.createExpense({
                tripId: activity.tripId,
                title: `Activity: ${activity.name}`,
                amount: activity.cost,
                currency: 'USD',
                category: 'activities',
                description: `Prepaid activity expense for ${activity.name}`,
                paidBy: activityCreatorId,
                activityId: activityId,
                date: new Date()
              });
            }

            // Get all users who have RSVP'd "going" (including current user after update)
            const updatedRsvps = await storage.getActivityRSVPs(activityId);
            const goingUserIds = updatedRsvps
              .filter(rsvp => rsvp.status === 'going')
              .map(rsvp => rsvp.userId);
            
            // Ensure current user is included
            if (!goingUserIds.includes(user.id)) {
              goingUserIds.push(user.id);
            }

            // Calculate cost per person
            const costPerPerson = parseFloat(activity.cost) / goingUserIds.length;

            // Remove existing splits and recreate them with updated amounts
            await storage.removeExpenseSplits(existingActivityExpense.id);

            // Create expense splits for all going users
            for (const userId of goingUserIds) {
              await storage.createExpenseSplit({
                expenseId: existingActivityExpense.id,
                userId: userId,
                amount: costPerPerson.toFixed(2)
              });
            }
          }
        } catch (expenseError) {
          console.error('Error handling prepaid activity expense:', expenseError);
          // Don't fail the RSVP if expense handling fails
        }
      }

      // Handle expense updates for prepaid_per_person activities
      if (activity.paymentType === 'prepaid_per_person' && activity.cost && parseFloat(activity.cost) > 0) {
        try {
          const activityCreatorId = activity.createdBy || user.id;
          const existingExpenses = await storage.getExpensesByTrip(activity.tripId);
          const userExpense = existingExpenses.find(expense => 
            expense.activityId === activityId && 
            expense.description?.includes(`for ${user.username || user.name || `User ${user.id}`}`)
          );

          // If user is changing from "going" to "not going"
          if (status === 'not going' && previousStatus === 'going' && userExpense) {
            // Get current splits to check if expense is settled
            const currentSplits = await storage.getExpenseSplits(userExpense.id);
            const userSplit = currentSplits.find(split => split.userId === user.id);
            
            if (userSplit) {
              // Check if expense is settled (isSettled flag or has confirmed settlements)
              const isExpenseSettled = userExpense.isSettled;
              const settlements = await storage.getSettlementsByTrip(activity.tripId);
              const confirmedSettlements = settlements.filter(s => s.status === 'confirmed');
              const hasConfirmedSettlements = confirmedSettlements.length > 0;
              
              // If expense is settled, just remove the split (user is now owed money)
              // The balance calculation will automatically show they're owed the amount
              if (isExpenseSettled || hasConfirmedSettlements) {
                // Remove user's split - they're now owed the amount they paid
                await storage.removeUserFromExpenseSplit(userExpense.id, user.id);
                // Keep the expense for financial history
              } else {
                // Expense not settled - can safely delete the entire expense
                await storage.removeExpenseSplits(userExpense.id);
                await storage.deleteExpense(userExpense.id);
              }
            }
          }
          // If user is changing from "not going" to "going" or is new
          else if (status === 'going' && previousStatus !== 'going') {
            // Only create expense if the user is NOT the activity creator
            // The creator shouldn't owe themselves money
            if (user.id !== activityCreatorId) {
              // Check if expense already exists for this user
              if (!userExpense) {
                // Create individual expense for this user
                const expense = await storage.createExpense({
                  tripId: activity.tripId,
                  title: `Activity: ${activity.name}`,
                  amount: activity.cost,
                  currency: 'USD',
                  category: 'activities',
                  description: `Prepaid per-person activity expense for ${user.username || user.name || `User ${user.id}`} - ${activity.name}`,
                  paidBy: activityCreatorId,
                  activityId: activityId,
                  date: new Date()
                });

                // Create expense split for just this user (full amount)
                await storage.createExpenseSplit({
                  expenseId: expense.id,
                  userId: user.id,
                  amount: activity.cost
                });
              } else {
                // Expense exists but user wasn't in it - add them back
                const existingSplits = await storage.getExpenseSplits(userExpense.id);
                const hasUserSplit = existingSplits.some(split => split.userId === user.id);
                
                if (!hasUserSplit) {
                  await storage.createExpenseSplit({
                    expenseId: userExpense.id,
                    userId: user.id,
                    amount: activity.cost
                  });
                }
              }
            }
          }
        } catch (expenseError) {
          console.error('Error handling prepaid_per_person activity expense:', expenseError);
          // Don't fail the RSVP if expense handling fails
        }
      }
      
      res.json(rsvp);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Message Routes
  // Migration endpoint to convert file-based images to base64 (run once to preserve existing images)
  router.post('/admin/migrate-images', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      // Only allow admin users to run migration
      if (user.username !== 'admin' && user.username !== 'aimar') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      console.log('🔄 Starting image migration...');
      const fs = await import('fs/promises');
      const pathMod = await import('path');
      
      // Get all messages with file-based image URLs
      const messages = await storage.getAllMessages();
      let migratedCount = 0;
      let errorCount = 0;

      for (const message of messages) {
        if (message.image && message.image.startsWith('/uploads/')) {
          try {
            const filePath = pathMod.resolve(process.cwd(), message.image.substring(1));
            
            if (await fs.access(filePath).then(() => true).catch(() => false)) {
              const buffer = await fs.readFile(filePath);
              const mimeType = getMimeTypeFromPath(filePath);
              const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;
              
              // Update the message with base64 data
              await storage.updateMessage(message.id, { image: base64Data });
              migratedCount++;
              console.log(`✅ Migrated image: ${message.image}`);
            } else {
              console.log(`⚠️ File not found: ${message.image}`);
              errorCount++;
            }
          } catch (error) {
            console.error(`❌ Error migrating image ${message.image}:`, error);
            errorCount++;
          }
        }
      }

      console.log(`🎉 Image migration completed: ${migratedCount} migrated, ${errorCount} errors`);
      res.json({ 
        message: 'Image migration completed', 
        migrated: migratedCount, 
        errors: errorCount 
      });
    } catch (error) {
      console.error('Error during image migration:', error);
      res.status(500).json({ message: 'Migration failed' });
    }
  });

  // Upload chat image (JSON data URL) and return the data URL for database storage
  router.post('/trips/:id/upload-image', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return;

      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }

      // Ensure user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const memberInfo = members.find(member => member.userId === authUser.id);
      if (!memberInfo) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }

      const { dataUrl } = req.body as { dataUrl?: string };
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ message: 'dataUrl is required' });
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!match) {
        return res.status(400).json({ message: 'Malformed image data URL' });
      }
      const mimeType = match[1];
      const base64Payload = match[2];
      const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
      if (!allowedMimeTypes.has(mimeType)) {
        return res.status(400).json({ message: 'Unsupported image type' });
      }

      // Validate base64 and size (5MB)
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      if (!base64Regex.test(base64Payload)) {
        return res.status(400).json({ message: 'Invalid base64 image data' });
      }
      const padding = (base64Payload.endsWith('==') ? 2 : (dataUrl.endsWith('=') ? 1 : 0));
      const decodedBytes = Math.floor(base64Payload.length * 3 / 4) - padding;
      const maxBytes = 5 * 1024 * 1024;
      if (decodedBytes > maxBytes) {
        return res.status(413).json({ message: 'Image too large (max 5MB)' });
      }

      // Return the data URL directly for database storage (no file system)
      // This ensures images persist across redeploys
      return res.status(201).json({ url: dataUrl });
    } catch (error) {
      console.error('Error uploading chat image:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });
  router.get('/trips/:id/messages', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const messages = await storage.getMessagesByTrip(tripId);
      
      // Get user details for each message
      const messagesWithUser = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          if (!user) return message;
          
          // Remove sensitive user information and format for chat component
          const { password, ...userWithoutPassword } = user;
          
          return {
            id: message.id,
            content: message.content,
            image: message.image,
            timestamp: message.timestamp.toISOString(),
            tripId: message.tripId,
            userId: message.userId,
            user: {
              id: userWithoutPassword.id,
              name: userWithoutPassword.name || userWithoutPassword.username || 'Anonymous',
              avatar: userWithoutPassword.avatar
            }
          };
        })
      );
      
      res.json(messagesWithUser);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/trips/:id/messages', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip (any status)
      const members = await storage.getTripMembers(tripId);
      const memberInfo = members.find(member => member.userId === authUser.id);
      
      if (!memberInfo) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const { content, imageBase64, imageUrl, images } = req.body as { 
        content?: string; 
        imageBase64?: string; 
        imageUrl?: string;
        images?: string[]; // Support for multiple images
      };

      if ((!content || !content.trim()) && !imageBase64 && !imageUrl && (!images || images.length === 0)) {
        return res.status(400).json({ message: 'Message content or image is required' });
      }

      // Validate and process images
      let imageDataUrls: string[] = [];
      
      // Helper function to validate and process a single image
      const processImage = async (imageData: string, isBase64: boolean = true): Promise<string | null> => {
        if (isBase64) {
          if (typeof imageData !== 'string') {
            return null;
          }
          const allowedMimeTypes = new Set([
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
            'image/gif'
          ]);

          let base64Payload = imageData;
          let mimeType = 'image/png';
          const isDataUrl = imageData.startsWith('data:');
          if (isDataUrl) {
            const match = imageData.match(/^data:([^;]+);base64,(.*)$/);
            if (!match) {
              return null;
            }
            mimeType = match[1];
            base64Payload = match[2];
            if (!allowedMimeTypes.has(mimeType)) {
              return null;
            }
          }

          // Basic base64 validation
          const base64Regex = /^[A-Za-z0-9+/=]+$/;
          if (!base64Regex.test(base64Payload)) {
            return null;
          }

          // Enforce decoded size limit (5 MB)
          const padding = (base64Payload.endsWith('==') ? 2 : (base64Payload.endsWith('=') ? 1 : 0));
          const decodedBytes = Math.floor(base64Payload.length * 3 / 4) - padding;
          const maxBytes = 5 * 1024 * 1024;
          if (decodedBytes > maxBytes) {
            return null;
          }

          return isDataUrl ? imageData : `data:${mimeType};base64,${base64Payload}`;
        } else {
          // Handle file URLs
          if (typeof imageData !== 'string') {
            return null;
          }
          
          if (imageData.startsWith('/uploads/')) {
            try {
              const fs = await import('fs/promises');
              const pathMod = await import('path');
              const filePath = pathMod.resolve(process.cwd(), imageData.substring(1));
              
              if (await fs.access(filePath).then(() => true).catch(() => false)) {
                const buffer = await fs.readFile(filePath);
                const mimeType = getMimeTypeFromPath(filePath);
                return `data:${mimeType};base64,${buffer.toString('base64')}`;
              }
            } catch (error) {
              console.log(`⚠️ Error converting file to base64: ${imageData}`, error);
            }
          }
          
          if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
            return imageData;
          }
          
          return null;
        }
      };

      // Process single image (backward compatibility)
      if (imageBase64) {
        const processedImage = await processImage(imageBase64, true);
        if (processedImage) {
          imageDataUrls.push(processedImage);
        }
      }

      if (imageUrl) {
        const processedImage = await processImage(imageUrl, false);
        if (processedImage) {
          imageDataUrls.push(processedImage);
        }
      }

      // Process multiple images array
      if (images && Array.isArray(images)) {
        for (const image of images) {
          const processedImage = await processImage(image, true);
          if (processedImage) {
            imageDataUrls.push(processedImage);
          }
        }
      }
      
      const message = await storage.createMessage({
        tripId,
        userId: authUser.id,
        content: content?.trim() ?? "",
        image: imageDataUrls.length > 0 ? imageDataUrls : undefined,
      });
      
      // Get user details for the response
      const userData = await storage.getUser(message.userId);
      const { password, ...userWithoutPassword } = userData!;
      
      const messageWithUser = {
        id: message.id,
        content: message.content,
        image: message.image,
        timestamp: message.timestamp.toISOString(),
        tripId: message.tripId,
        userId: message.userId,
        user: {
          id: userWithoutPassword.id,
          name: userWithoutPassword.name,
          avatar: userWithoutPassword.avatar
        }
      };
      
      // Broadcast via WebSocket for real-time updates
      console.log(`Broadcasting message to ${tripId} via WebSocket`);
      console.log('Connected clients:', wss.clients.size);
      
      wss.clients.forEach((client: WebSocketClient) => {
        console.log('Client tripIds:', client.tripIds, 'Client readyState:', client.readyState);
        if (client.readyState === WebSocket.OPEN && client.tripIds?.includes(tripId)) {
          console.log('Sending message to client');
          client.send(JSON.stringify({
            type: 'new_message',
            data: messageWithUser
          }));
        }
      });
      
      res.status(201).json(messageWithUser);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Survey Routes
  router.post('/trips/:id/survey', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Only organizer can create survey questions
      if (trip.organizer !== authUser.id) {
        return res.status(403).json({ message: 'Only the trip organizer can create surveys' });
      }
      
      const { questions } = req.body;
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: 'Questions are required' });
      }
      
      const createdQuestions = await Promise.all(
        questions.map(async (q) => {
          const questionData = insertSurveyQuestionSchema.parse({
            ...q,
            tripId
          });
          return storage.createSurveyQuestion(questionData);
        })
      );
      
      res.status(201).json(createdQuestions);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid survey data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.get('/trips/:id/survey', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === authUser.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const questions = await storage.getSurveyQuestionsByTrip(tripId);
      
      // For each question, get responses
      const questionsWithResponses = await Promise.all(
        questions.map(async (question) => {
          const responses = await storage.getSurveyResponses(question.id);
          return {
            ...question,
            responses
          };
        })
      );
      
      res.json(questionsWithResponses);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/survey/:id/respond', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      const questionId = parseInt(req.params.id);
      if (isNaN(questionId)) {
        return res.status(400).json({ message: 'Invalid question ID' });
      }
      
      const { response } = req.body;
      if (response === undefined) {
        return res.status(400).json({ message: 'Response is required' });
      }
      
      const responseData = insertSurveyResponseSchema.parse({
        questionId,
        userId: authUser.id,
        response: String(response)
      });
      
      const createdResponse = await storage.createSurveyResponse(responseData);
      res.status(201).json(createdResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid response data', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all messages and polls for the current user across all trips
  router.get('/messages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = ensureUser(req, res);
      if (!authUser) return; // Response already sent by ensureUser
      
      // Get all trips the user is a member of
      const memberships = await storage.getTripMembershipsByUser(authUser.id);
      const tripIds = memberships.map(membership => membership.tripId);
      
      // Get messages and polls from all these trips
      const allMessagesWithDetails = [];
      
      for (const tripId of tripIds) {
        // Get regular messages
        const tripMessages = await storage.getMessagesByTrip(tripId);
        
        // Get trip details
        const trip = await storage.getTrip(tripId);
        
        // Get user details for each message
        const messagesWithDetails = await Promise.all(tripMessages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            image: message.image,
            type: 'message',
            tripId,
            tripName: trip?.name || 'Unknown Trip',
            user: user ? {
              id: user.id,
              name: user.name || user.username || 'Anonymous',
              avatar: user.avatar
            } : null
          };
        }));
        
        // Get polls for this trip
        const tripPolls = await storage.getPollsByTrip(tripId);
        
        // Get user details for each poll
        const pollsWithDetails = await Promise.all(tripPolls.map(async (poll) => {
          const user = await storage.getUser(poll.createdBy);
          return {
            id: `poll-${poll.id}`,
            content: `Poll: ${poll.title}`,
            type: 'poll',
            timestamp: poll.createdAt,
            tripId,
            tripName: trip?.name || 'Unknown Trip',
            userId: poll.createdBy, // For unread calculation
            pollData: poll,
            user: user ? {
              id: user.id,
              name: user.name || user.username || 'Anonymous',
              avatar: user.avatar
            } : null
          };
        }));
        
        // Add both messages and polls to the results
        allMessagesWithDetails.push(...messagesWithDetails, ...pollsWithDetails);
      }
      
      // Sort by timestamp (newest first)
      allMessagesWithDetails.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      res.json(allMessagesWithDetails);
    } catch (error) {
      console.error('Error getting all messages and polls:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all activities for the current user across all trips
  router.get('/activities', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get all trips the user is a member of
      const memberships = await storage.getTripMembershipsByUser(req.user!.id);
      const tripIds = memberships.map(membership => membership.tripId);
      
      // Get activities from all these trips
      const allActivitiesWithDetails = [];
      
      for (const tripId of tripIds) {
        const tripActivities = await storage.getActivitiesByTrip(tripId);
        
        // Get trip details
        const trip = await storage.getTrip(tripId);
        
        // Add trip details to each activity
        const activitiesWithTripDetails = tripActivities.map(activity => ({
          ...activity,
          tripName: trip?.name || 'Unknown Trip'
        }));
        
        allActivitiesWithDetails.push(...activitiesWithTripDetails);
      }
      
      // Sort by date
      allActivitiesWithDetails.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      res.json(allActivitiesWithDetails);
    } catch (error) {
      console.error('Error getting all activities:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get individual activity details with RSVPs
  router.get('/activities/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      // Validate and parse ID (supports encrypted or plain IDs)
      let activityId: number;
      try {
        activityId = parseUrlId(req.params.id, false);
      } catch (error) {
        if (error instanceof ValidationError || error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        return res.status(400).json({ message: 'Invalid activity ID' });
      }

      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      // SECURITY FIX: Check if user is a member of the trip
      const members = await storage.getTripMembers(activity.tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }

      // Get RSVPs for this activity
      const rsvps = await storage.getActivityRSVPs(activityId);
      
      // Add user information to RSVPs
      const rsvpsWithUsers = await Promise.all(
        rsvps.map(async (rsvp) => {
          const rsvpUser = await storage.getUser(rsvp.userId);
          return {
            ...rsvp,
            user: {
              id: rsvpUser?.id,
              name: rsvpUser?.name || rsvpUser?.username || 'Unknown User',
              avatar: rsvpUser?.avatar
            }
          };
        })
      );

      // Get creator information
      const creator = await storage.getUser(activity.createdBy);
      const creatorInfo = creator ? {
        id: creator.id,
        name: creator.name || creator.username || 'Unknown User',
        avatar: creator.avatar
      } : null;

      const activityWithRSVPs = {
        ...activity,
        rsvps: rsvpsWithUsers,
        creator: creatorInfo
      };

      res.json(activityWithRSVPs);
    } catch (error) {
      console.error('Error fetching activity details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Invitation Links
  router.post('/trips/:id/invite', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a member of the trip
      const tripMembers = await storage.getTripMembers(tripId);
      const isMember = tripMembers.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You must be a member of this trip to create invitation links' });
      }
      
      // Create expiration date (default: 7 days from now)
      const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const invitationData = insertInvitationLinkSchema.parse({
        tripId,
        createdBy: user.id,
        expiresAt
      });
      
      const invitation = await storage.createInvitationLink(invitationData);
      
      // Return the invitation with full URL
      // Use the actual domain from the request, handling both development and production
      const host = req.get('host');
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const inviteUrl = `${protocol}://${host}/invite/${invitation.token}`;
      
      res.status(201).json({
        ...invitation,
        inviteUrl
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid invitation data', errors: error.errors });
      }
      console.error('Error creating invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/trips/:id/invites', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is a member of the trip
      const tripMembers = await storage.getTripMembers(tripId);
      const isMember = tripMembers.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'You must be a member of this trip to view invitation links' });
      }
      
      const invites = await storage.getInvitationLinksByTrip(tripId);
      
      // Add full invite URLs
      const host = req.get('host');
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const invitesWithUrls = invites.map(invite => ({
        ...invite,
        inviteUrl: `${protocol}://${host}/invite/${invite.token}`
      }));
      
      res.json(invitesWithUrls);
    } catch (error) {
      console.error('Error retrieving invitations:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Public route to validate an invitation token and get trip details
  router.get('/invite/:token', async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      
      const invitation = await storage.getInvitationLink(token);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or has expired' });
      }
      
      // Check if invitation is still active
      if (!invitation.isActive) {
        return res.status(410).json({ message: 'This invitation link has been deactivated' });
      }
      
      // Check if invitation has expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ message: 'This invitation link has expired' });
      }
      
      // Get trip details to show to the invited user
      const trip = await storage.getTrip(invitation.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'The associated trip was not found' });
      }
      
      // Get trip organizer details
      const organizer = await storage.getUser(trip.organizer);
      
      // Get trip activities (public information for invitation)
      const activities = await storage.getActivitiesByTrip(invitation.tripId);
      
      // Get trip members (public information for invitation)
      const members = await storage.getTripMembers(invitation.tripId);
      
      // Get user details for each member
      const membersWithUser = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return {
            userId: member.userId,
            status: member.status,
            user: user ? {
              id: user.id,
              name: user.name || user.username,
              username: user.username
            } : null
          };
        })
      );
      
      // Return comprehensive trip details for the invitation page
      res.json({
        invitation: {
          id: invitation.id,
          token: invitation.token,
          expiresAt: invitation.expiresAt
        },
        trip: {
          id: trip.id,
          name: trip.name,
          destination: trip.destination,
          startDate: trip.startDate,
          endDate: trip.endDate,
          description: trip.description,
          requiresDownPayment: trip.requiresDownPayment,
          downPaymentAmount: trip.downPaymentAmount,
          cover: trip.cover,
          accommodationLinks: trip.accommodationLinks,
          airportGateway: trip.airportGateway,
          organizer: organizer ? {
            id: organizer.id,
            name: organizer.name || organizer.username,
            username: organizer.username
          } : null
        },
        activities: activities.map(activity => ({
          id: activity.id,
          title: activity.name,
          description: activity.description || '',
          date: activity.date.toISOString().split('T')[0],
          time: activity.date.toISOString().split('T')[1].substring(0, 5),
          location: activity.location || '',
          activityLink: activity.activityLink || '',
          activityType: activity.activityType || '',
          startTime: activity.startTime || '',
          duration: activity.duration || '',
          cost: activity.cost || '',
          paymentType: activity.paymentType || 'free',
          maxParticipants: activity.maxParticipants || null,
          checkInDate: activity.checkInDate || null,
          checkOutDate: activity.checkOutDate || null
        })),
        members: membersWithUser.filter(member => member.user !== null)
      });
    } catch (error) {
      console.error('Error processing invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Accept an invitation (requires authentication)
  router.post('/invite/:token/accept', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const token = req.params.token;
      
      const invitation = await storage.getInvitationLink(token);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or has expired' });
      }
      
      // Check if invitation is still active
      if (!invitation.isActive) {
        return res.status(410).json({ message: 'This invitation link has been deactivated' });
      }
      
      // Check if invitation has expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(410).json({ message: 'This invitation link has expired' });
      }
      
      // Get trip details to check if down payment is required
      const trip = await storage.getTrip(invitation.tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is already a member (including declined members)
      const existingMember = await storage.getTripMemberWithPaymentInfo(invitation.tripId, user.id);
      
      let tripMember;
      if (existingMember) {
        // User already exists - reset their status to allow rejoining
        // For paid trips, keep status as pending until payment is confirmed
        const memberStatus = trip.requiresDownPayment ? "pending" : "confirmed";
        const rsvpStatus = trip.requiresDownPayment ? "pending" : "confirmed";
        
        // Update existing member to reset their status
        await storage.updateTripMemberStatus(invitation.tripId, user.id, memberStatus);
        await storage.updateTripMemberRSVPStatus(invitation.tripId, user.id, rsvpStatus);
        
        // Reset payment status if they were previously rejected
        if (existingMember.paymentStatus === 'rejected') {
          await storage.updateTripMemberPaymentInfo(invitation.tripId, user.id, {
            paymentStatus: trip.requiresDownPayment ? 'not_required' : 'not_required',
            paymentMethod: null,
            paymentAmount: trip.requiresDownPayment ? trip.downPaymentAmount?.toString() : null,
            paymentSubmittedAt: null,
            paymentConfirmedAt: null
          });
        }
        
        // Get the updated member
        tripMember = await storage.getTripMemberWithPaymentInfo(invitation.tripId, user.id);
      } else {
        // New member - add them normally
        // For paid trips, keep status as pending until payment is confirmed
        const memberStatus = trip.requiresDownPayment ? "pending" : "confirmed";
        const rsvpStatus = trip.requiresDownPayment ? "pending" : "confirmed";
        
        tripMember = await storage.addTripMember({
          tripId: invitation.tripId,
          userId: user.id,
          status: memberStatus,
          rsvpStatus: rsvpStatus,
          rsvpDate: rsvpStatus === "confirmed" ? new Date() : undefined
        });
      }
      
      res.status(201).json({ 
        message: 'Successfully joined the trip',
        tripId: invitation.tripId,
        membership: tripMember
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // SELF-JOIN TRIP ROUTE (for invitation links)
  router.post('/trips/:id/join', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.id);
      const { rsvpStatus = 'pending' } = req.body;
      
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found' });
      }
      
      // Check if user is already a member
      const existingMember = await storage.getTripMember(tripId, user.id);
      if (existingMember) {
        return res.status(400).json({ message: 'You are already a member of this trip' });
      }
      
      // Add user as a member with the specified RSVP status
      // For paid trips, keep BOTH status and rsvpStatus as pending until payment is confirmed
      const memberStatus = trip.requiresDownPayment ? 'pending' : 'confirmed';
      const finalRsvpStatus = trip.requiresDownPayment ? 'pending' : rsvpStatus;
      const member = await storage.addTripMember({
        tripId,
        userId: user.id,
        status: memberStatus,
        rsvpStatus: finalRsvpStatus,
        rsvpDate: new Date()
      });
      
      res.status(201).json(member);
    } catch (error) {
      console.error('Error joining trip:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // NOTIFICATION ROUTES
  
  // Create notification
  router.post('/notifications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const { type, title, message, data } = req.body;
      
      if (!type || !title || !message) {
        return res.status(400).json({ message: 'Type, title, and message are required' });
      }
      
      // Get trip organizer for RSVP notifications
      let targetUserId = user.id;
      if (type === 'rsvp_response' && data?.tripId) {
        const trip = await storage.getTrip(data.tripId);
        if (trip) {
          targetUserId = trip.organizer;
        }
      }
      
      const notification = await storage.createNotification({
        userId: targetUserId,
        type,
        title,
        message,
        data: data || null
      });
      
      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get user notifications
  router.get('/notifications', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const notifications = await storage.getUserNotifications(user.id);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Mark notification as read
  router.put('/notifications/:id/read', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: 'Invalid notification ID' });
      }
      
      const notification = await storage.markNotificationAsRead(notificationId, user.id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // EXPENSE ROUTES
  
  // Removed duplicate expense route - using the one at line 2860 instead
  
  // Get all expenses for a trip
  router.get('/trips/:id/expenses', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const expenses = await storage.getExpensesByTrip(tripId);
      
      // Get user details for each expense
      const expensesWithUserDetails = await Promise.all(
        expenses.map(async (expense) => {
          const creator = await storage.getUser(expense.userId);
          const payer = await storage.getUser(expense.paidBy);
          
          return {
            ...expense,
            createdBy: creator ? {
              id: creator.id,
              name: creator.name,
              username: creator.username,
              avatar: creator.avatar
            } : null,
            paidBy: payer ? {
              id: payer.id,
              name: payer.name,
              username: payer.username,
              avatar: payer.avatar
            } : null
          };
        })
      );
      
      res.json(expensesWithUserDetails);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get expense summary for a trip
  router.get('/trips/:id/expenses/summary', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const summary = await storage.getTripExpenseSummary(tripId);
      
      // Add user details for each payer in the summary
      const payerIds = Object.keys(summary.byPayer).map(id => parseInt(id));
      const payerDetails = await Promise.all(
        payerIds.map(async (id) => {
          const user = await storage.getUser(id);
          return user ? {
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar
          } : null;
        })
      );
      
      const payersWithDetails = payerIds.reduce((acc, id, index) => {
        if (payerDetails[index]) {
          acc[id] = {
            amount: summary.byPayer[id],
            user: payerDetails[index]
          };
        }
        return acc;
      }, {} as Record<string, any>);
      
      const enhancedSummary = {
        ...summary,
        byPayer: payersWithDetails
      };
      
      res.json(enhancedSummary);
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update an expense
  router.put('/expenses/:id', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const expenseId = parseInt(req.params.id);
      if (isNaN(expenseId)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }
      
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      // Implement enhanced permission system for financial integrity
      const trip = await storage.getTrip(expense.tripId);
      const members = await storage.getTripMembers(expense.tripId);
      const membership = members.find(m => m.userId === user.id);
      const isAdmin = membership?.isAdmin || false;
      const isOrganizer = trip?.organizer === user.id;
      
      // Check for financial integrity restrictions
      // 1. Check if this expense was involved in existing settlements
      const settlements = await storage.getSettlementsByTrip(expense.tripId);
      if (settlements.length > 0) {
        // Only block if this expense existed before the settlements were created
        const oldestSettlement = Math.min(...settlements.map(s => new Date(s.createdAt).getTime()));
        const expenseCreatedAt = new Date(expense.createdAt).getTime();
        
        if (expenseCreatedAt < oldestSettlement) {
          return res.status(403).json({ 
            message: `Cannot modify this expense because it was included in settlement calculations. Changing expenses that were part of settlements would make the financial records inconsistent.` 
          });
        }
      }
      
      // 2. Check if any users involved in this expense have been removed from the trip
      const expenseSplits = await storage.getExpenseSplits(expense.id);
      const involvedUserIds = [expense.paidBy, ...expenseSplits.map(split => split.userId)];
      const currentMemberIds = members.map(m => m.userId);
      
      const hasRemovedUsers = involvedUserIds.some(userId => !currentMemberIds.includes(userId));
      if (hasRemovedUsers) {
        return res.status(403).json({ 
          message: 'Cannot modify this expense because it involves users who have been removed from the trip. Changing expenses with removed users would create inconsistent financial data.' 
        });
      }
      
      // Check if this is a manual expense (not linked to an activity)
      const isManualExpense = !expense.activityId;
      
      if (isManualExpense) {
        // For manual expenses: only the creator can update
        if (expense.paidBy !== user.id) {
          return res.status(403).json({ 
            message: 'Only the creator of a manual expense can modify it' 
          });
        }
      } else {
        // For prepaid activity expenses: admins and organizer can update
        if (!isAdmin && !isOrganizer) {
          return res.status(403).json({ 
            message: 'Only trip admins can modify prepaid activity expenses' 
          });
        }
      }
      
      const expenseUpdate = req.body;
      const updatedExpense = await storage.updateExpense(expenseId, expenseUpdate);
      
      // Notify trip members about the updated expense
      broadcastToTrip(wss, expense.tripId, {
        type: 'UPDATE_EXPENSE',
        data: updatedExpense
      });
      
      res.json(updatedExpense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete an expense
  router.delete('/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const expenseId = parseInt(req.params.id);
      if (isNaN(expenseId)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }
      
      const expense = await storage.getExpense(expenseId);
      
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      
      // Implement enhanced permission system for financial integrity
      const trip = await storage.getTrip(expense.tripId);
      const members = await storage.getTripMembers(expense.tripId);
      const membership = members.find(m => m.userId === user.id);
      const isAdmin = membership?.isAdmin || false;
      const isOrganizer = trip?.organizer === user.id;
      
      // Check for financial integrity restrictions
      // 1. Check if this expense was involved in existing settlements
      const settlements = await storage.getSettlementsByTrip(expense.tripId);
      if (settlements.length > 0) {
        // Only block if this expense existed before the settlements were created
        const oldestSettlement = Math.min(...settlements.map(s => new Date(s.createdAt).getTime()));
        const expenseCreatedAt = new Date(expense.createdAt).getTime();
        
        if (expenseCreatedAt < oldestSettlement) {
          return res.status(403).json({ 
            message: `Cannot delete this expense because it was included in settlement calculations. Deleting expenses that were part of settlements would corrupt the financial records and make balances inaccurate.` 
          });
        }
      }
      
      // 2. Check if any users involved in this expense have been removed from the trip
      const expenseSplits = await storage.getExpenseSplits(expenseId);
      const involvedUserIds = [expense.paidBy, ...expenseSplits.map(split => split.userId)];
      const currentMemberIds = members.map(m => m.userId);
      
      const hasRemovedUsers = involvedUserIds.some(userId => !currentMemberIds.includes(userId));
      if (hasRemovedUsers) {
        return res.status(403).json({ 
          message: 'Cannot delete this expense because it involves users who have been removed from the trip. Deleting expenses with removed users would create inconsistent financial data.' 
        });
      }
      
      // Check if this is a manual expense (not linked to an activity)
      const isManualExpense = !expense.activityId;
      
      if (isManualExpense) {
        // For manual expenses: only the creator can delete
        if (expense.paidBy !== user.id) {
          return res.status(403).json({ 
            message: 'Only the creator of a manual expense can delete it' 
          });
        }
      } else {
        // For prepaid activity expenses: admins and organizer can delete
        if (!isAdmin && !isOrganizer) {
          return res.status(403).json({ 
            message: 'Only trip admins can delete prepaid activity expenses' 
          });
        }
      }
      
      // If this expense is linked to an activity, delete the activity as well (cascading deletion)
      let activityDeleted = false;
      if (expense.activityId) {
        try {
          const activityExists = await storage.getActivity(expense.activityId);
          if (activityExists) {
            await storage.deleteActivity(expense.activityId);
            activityDeleted = true;
          }
        } catch (activityError) {
          console.error('Error deleting linked activity:', activityError);
          // Continue with expense deletion even if activity deletion fails
        }
      }

      const success = await storage.deleteExpense(expenseId);
      
      if (success) {
        // Notify trip members about the deleted expense
        broadcastToTrip(wss, expense.tripId, {
          type: 'DELETE_EXPENSE',
          data: { id: expenseId, tripId: expense.tripId }
        });

        // If we also deleted an activity, notify about that too
        if (activityDeleted && expense.activityId) {
          broadcastToTrip(wss, expense.tripId, {
            type: 'DELETE_ACTIVITY',
            data: { id: expense.activityId, tripId: expense.tripId }
          });
        }
        
        const message = activityDeleted 
          ? 'Expense and linked activity deleted successfully'
          : 'Expense deleted successfully';
        res.status(200).json({ message });
      } else {
        res.status(500).json({ message: 'Failed to delete expense' });
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // FLIGHT INFO ROUTES
  
  // Create new flight information
  router.post('/trips/:id/flights', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      // Check if user already has a flight for this trip
      const existingFlights = await storage.getFlightInfoByTrip(tripId);
      const userExistingFlight = existingFlights.find(flight => flight.userId === user.id);
      
      if (userExistingFlight) {
        return res.status(400).json({ message: 'You already have a flight registered for this trip. Please edit your existing flight instead.' });
      }
      
      // Try to lookup authentic flight information only
      let flightInfo = null;
      try {
        const { lookupFlightInfo } = await import('./flight-lookup');
        flightInfo = await lookupFlightInfo(req.body.flightNumber, req.body.departureDate || req.body.arrivalDate);
        console.log('Flight lookup result:', flightInfo);
      } catch (error) {
        console.log('Flight lookup failed:', (error as Error).message);
      }
      
      if (flightInfo && flightInfo.airline) {
        // Use only verified data - airline name from API, everything else from user input
        const flightData = insertFlightInfoSchema.parse({
          tripId,
          userId: user.id,
          flightNumber: req.body.flightNumber,
          airline: flightInfo.airline, // Only verified field from API
          departureAirport: req.body.departureAirport || "Not specified",
          departureCity: req.body.departureCity || "Not specified",
          departureTime: new Date(req.body.departureDate || req.body.arrivalDate), // Use user-provided departure date
          arrivalAirport: req.body.arrivalAirport || "Not specified",
          arrivalCity: req.body.arrivalCity || "Not specified",
          arrivalTime: new Date(req.body.departureDate || req.body.arrivalDate), // Use user-provided departure date
          price: req.body.price,
          currency: req.body.currency || "USD",
          bookingReference: req.body.bookingReference,
          bookingStatus: req.body.bookingStatus || "confirmed",
          seatNumber: req.body.seatNumber,
          notes: `Airline verified: ${flightInfo.airline}`,
          flightDetails: {
            userProvidedFlightNumber: req.body.flightNumber,
            userProvidedDepartureDate: req.body.departureDate || req.body.arrivalDate,
            status: "user-provided",
            hasRealTimeData: false,
            verifiedAirline: flightInfo.airline
          }
        });
        
        const flight = await storage.createFlightInfo(flightData);
        
        // Create a corresponding activity in the itinerary
        const activityData = {
          tripId,
          userId: user.id,
          name: `Flight ${req.body.flightNumber}`,
          description: `${flightInfo.airline} flight from departure to arrival`,
          date: new Date(req.body.departureDate || req.body.arrivalDate),
          location: `${req.body.departureAirport || 'Airport'} → ${req.body.arrivalAirport || 'Airport'}`,
          duration: null,
          cost: req.body.price || null
        };
        
        console.log('Creating flight activity:', activityData);
        try {
          const createdActivity = await storage.createActivity(activityData);
          console.log('Successfully created flight activity:', createdActivity);
        } catch (error) {
          console.error('Failed to create activity for flight:', error);
        }
        
        // Notify trip members about the new flight information
        broadcastToTrip(wss, tripId, {
          type: 'NEW_FLIGHT',
          data: flight
        });
        
        res.status(201).json(flight);
      } else {
        // No authentic data available - store only user-provided information
        const flightData = insertFlightInfoSchema.parse({
          tripId,
          userId: user.id,
          flightNumber: req.body.flightNumber,
          airline: "Unknown",
          departureAirport: "TBD",
          departureCity: "TBD",
          departureTime: new Date(req.body.departureDate || req.body.arrivalDate),
          arrivalAirport: "TBD",
          arrivalCity: "TBD",
          arrivalTime: new Date(req.body.departureDate || req.body.arrivalDate),
          price: req.body.price,
          currency: req.body.currency || "USD",
          bookingReference: req.body.bookingReference,
          bookingStatus: req.body.bookingStatus || "confirmed",
          seatNumber: req.body.seatNumber,
          notes: `Flight ${req.body.flightNumber} - no verified data available`,
          flightDetails: {
            userProvidedFlightNumber: req.body.flightNumber,
            userProvidedDepartureDate: req.body.departureDate || req.body.arrivalDate,
            status: "user-provided",
            hasRealTimeData: false
          },
        });
        
        const flight = await storage.createFlightInfo(flightData);
        
        // Create a corresponding activity in the itinerary (even without verified data)
        const activityData = {
          tripId,
          userId: user.id,
          name: `Flight ${req.body.flightNumber}`,
          description: `Flight from departure to arrival`,
          date: new Date(req.body.departureDate || req.body.arrivalDate),
          location: `${req.body.departureAirport || 'Airport'} → ${req.body.arrivalAirport || 'Airport'}`,
          duration: null,
          cost: req.body.price || null
        };
        
        console.log('Creating flight activity (no verified data):', activityData);
        try {
          const createdActivity = await storage.createActivity(activityData);
          console.log('Successfully created flight activity:', createdActivity);
        } catch (error) {
          console.error('Failed to create activity for flight:', error);
        }
        
        // Notify trip members about the new flight information
        broadcastToTrip(wss, tripId, {
          type: 'NEW_FLIGHT',
          data: flight
        });
        
        res.status(201).json(flight);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid flight data', errors: error.errors });
      } else {
        console.error('Error creating flight info:', error);
        res.status(500).json({ message: 'Server error' });
      }
    }
  });
  
  // Get all flight information for a trip
  router.get('/trips/:id/flights', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const flights = await storage.getFlightInfoByTrip(tripId);
      
      // Get user details for each flight
      const flightsWithUserDetails = await Promise.all(
        flights.map(async (flight) => {
          const user = await storage.getUser(flight.userId);
          
          return {
            ...flight,
            user: user ? {
              id: user.id,
              name: user.name,
              username: user.username,
              avatar: user.avatar
            } : null
          };
        })
      );
      
      res.json(flightsWithUserDetails);
    } catch (error) {
      console.error('Error fetching flight info:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Update flight information
  router.put('/flights/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const flightId = parseInt(req.params.id);
      if (isNaN(flightId)) {
        return res.status(400).json({ message: 'Invalid flight ID' });
      }
      
      const flight = await storage.getFlightInfo(flightId);
      
      if (!flight) {
        return res.status(404).json({ message: 'Flight information not found' });
      }
      
      // Only allow the creator to update flight information
      if (flight.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to update this flight information' });
      }
      
      // If flight number is being updated, re-verify airline information
      let flightInfo = null;
      if (req.body.flightNumber && req.body.flightNumber !== flight.flightNumber) {
        try {
          const { lookupFlightInfo } = await import('./flight-lookup');
          flightInfo = await lookupFlightInfo(req.body.flightNumber, req.body.departureDate || req.body.arrivalDate || flight.flightDetails?.userProvidedDepartureDate);
          console.log('Flight lookup result for update:', flightInfo);
        } catch (error) {
          console.log('Flight lookup failed during update:', (error as Error).message);
        }
      }

      // Prepare update data
      const updateData: any = {};
      
      if (req.body.flightNumber) {
        updateData.flightNumber = req.body.flightNumber.toUpperCase().trim();
        // Update airline if we have verified data
        if (flightInfo?.airline) {
          updateData.airline = flightInfo.airline;
          updateData.notes = `Airline verified: ${flightInfo.airline}`;
        }
      }
      
      if (req.body.departureDate || req.body.arrivalDate) {
        const dateToUse = req.body.departureDate || req.body.arrivalDate;
        updateData.arrivalTime = new Date(dateToUse);
        updateData.departureTime = new Date(dateToUse);
        // Update flight details with new date
        updateData.flightDetails = {
          ...flight.flightDetails,
          userProvidedDepartureDate: dateToUse,
          verifiedAirline: flightInfo?.airline || flight.flightDetails?.verifiedAirline
        };
      }

      const updatedFlight = await storage.updateFlightInfo(flightId, updateData);
      
      // Notify trip members about the updated flight information
      broadcastToTrip(wss, flight.tripId, {
        type: 'UPDATE_FLIGHT',
        data: updatedFlight
      });
      
      res.json(updatedFlight);
    } catch (error) {
      console.error('Error updating flight info:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Delete flight information
  router.delete('/flights/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const flightId = parseInt(req.params.id);
      if (isNaN(flightId)) {
        return res.status(400).json({ message: 'Invalid flight ID' });
      }
      
      const flight = await storage.getFlightInfo(flightId);
      
      if (!flight) {
        return res.status(404).json({ message: 'Flight information not found' });
      }
      
      // Only allow the creator to delete flight information
      if (flight.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to delete this flight information' });
      }
      
      const success = await storage.deleteFlightInfo(flightId);
      
      if (success) {
        // Notify trip members about the deleted flight information
        broadcastToTrip(wss, flight.tripId, {
          type: 'DELETE_FLIGHT',
          data: { id: flightId, tripId: flight.tripId }
        });
        
        res.status(200).json({ message: 'Flight information deleted successfully' });
      } else {
        res.status(500).json({ message: 'Failed to delete flight information' });
      }
    } catch (error) {
      console.error('Error deleting flight info:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Search for flights
  router.get('/flights/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return; // Response already sent by ensureUser
      
      const departureCity = req.query.departureCity as string;
      const arrivalCity = req.query.arrivalCity as string;
      const dateStr = req.query.date as string;
      
      if (!departureCity || !arrivalCity || !dateStr) {
        return res.status(400).json({ message: 'Missing required search parameters' });
      }
      
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      
      const flightResults = await storage.searchFlights(departureCity, arrivalCity, date);
      res.json(flightResults);
    } catch (error) {
      console.error('Error searching flights:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // POLL ROUTES
  
  // Create a new poll
  router.post('/trips/:id/polls', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip (any status)
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => 
        member.userId === user.id
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Must be a member of this trip to create polls' });
      }
      
      const pollData = insertPollSchema.parse({
        ...req.body,
        tripId,
        createdBy: user.id
      });
      
      const newPoll = await storage.createPoll(pollData);
      
      // Notify trip members about new poll via WebSocket
      broadcastToTrip(wss, tripId, {
        type: 'NEW_POLL',
        data: newPoll
      });
      
      res.status(201).json(newPoll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating poll:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get all polls for a trip
  router.get('/trips/:id/polls', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: 'Invalid trip ID' });
      }
      
      // Check if user is a member of the trip
      const members = await storage.getTripMembers(tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      const polls = await storage.getPollsByTrip(tripId);
      
      // For each poll, fetch votes to calculate results
      const pollsWithVotes = await Promise.all(polls.map(async (poll) => {
        const votes = await storage.getPollVotes(poll.id);
        const userVotes = await storage.getUserPollVotes(poll.id, user.id);
        
        // Create an array to track votes per option
        const voteCounts = poll.options.map(() => 0);
        
        // Count votes for each option
        votes.forEach(vote => {
          if (vote.optionIndex >= 0 && vote.optionIndex < voteCounts.length) {
            voteCounts[vote.optionIndex]++;
          }
        });
        
        // Get creator info
        const creator = await storage.getUser(poll.createdBy);
        
        return {
          ...poll,
          voteCounts,
          totalVotes: votes.length,
          hasVoted: userVotes.length > 0,
          userVotes,
          creator: creator ? {
            id: creator.id,
            name: creator.name || creator.username,
            avatar: creator.avatar
          } : null
        };
      }));
      
      res.json(pollsWithVotes);
    } catch (error) {
      console.error('Error fetching polls:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Vote on a poll
  router.post('/polls/:id/vote', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const pollId = parseInt(req.params.id);
      if (isNaN(pollId)) {
        return res.status(400).json({ message: 'Invalid poll ID' });
      }
      
      // Get the poll to check permissions
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: 'Poll not found' });
      }
      
      // Check if user is a member of the associated trip with confirmed RSVP
      const members = await storage.getTripMembers(poll.tripId);
      const member = members.find(member => member.userId === user.id);
      
      if (!member) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }
      
      // Allow organizer regardless of RSVP status
      const trip = await storage.getTrip(poll.tripId);
      if (trip?.organizer !== user.id && member.rsvpStatus !== 'confirmed') {
        return res.status(403).json({ 
          message: 'RSVP confirmation required to vote on polls',
          rsvpStatus: member.rsvpStatus,
          requiresRSVP: true 
        });
      }
      
      // Check if poll is still active
      if (!poll.isActive) {
        return res.status(400).json({ message: 'This poll is no longer active' });
      }
      
      // If end date is set and has passed, poll is expired
      if (poll.endDate && new Date(poll.endDate) < new Date()) {
        return res.status(400).json({ message: 'This poll has expired' });
      }
      
      const voteData = insertPollVoteSchema.parse({
        pollId,
        userId: user.id,
        optionIndex: req.body.optionIndex
      });
      
      // For single-choice polls, delete previous votes if any
      if (!poll.multipleChoice) {
        const userVotes = await storage.getUserPollVotes(pollId, user.id);
        for (const vote of userVotes) {
          await storage.deletePollVote(vote.id);
        }
      }
      
      const newVote = await storage.createPollVote(voteData);
      
      // Get updated votes for the poll
      const votes = await storage.getPollVotes(pollId);
      
      // Create vote counts array
      const voteCounts = poll.options.map(() => 0);
      votes.forEach(vote => {
        if (vote.optionIndex >= 0 && vote.optionIndex < voteCounts.length) {
          voteCounts[vote.optionIndex]++;
        }
      });
      
      // Notify trip members about new vote via WebSocket
      broadcastToTrip(wss, poll.tripId, {
        type: 'POLL_VOTE',
        data: {
          pollId,
          vote: newVote,
          voteCounts,
          totalVotes: votes.length
        }
      });
      
      res.status(201).json({
        vote: newVote,
        pollVotes: votes,
        voteCounts,
        totalVotes: votes.length
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error voting on poll:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Remove a vote from a poll
  router.delete('/polls/:pollId/votes/:voteId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;
      
      const pollId = parseInt(req.params.pollId);
      const voteId = parseInt(req.params.voteId);
      
      if (isNaN(pollId) || isNaN(voteId)) {
        return res.status(400).json({ message: 'Invalid poll or vote ID' });
      }
      
      // Get the poll to check permissions
      const poll = await storage.getPoll(pollId);
      if (!poll) {
        return res.status(404).json({ message: 'Poll not found' });
      }
      
      // Check if user is a member of the associated trip
      const members = await storage.getTripMembers(poll.tripId);
      const isMember = members.some(member => 
        member.userId === user.id && member.status === 'confirmed' && member.rsvpStatus === 'confirmed'
      );
      
      if (!isMember) {
        return res.status(403).json({ message: 'Must be a confirmed member to manage votes' });
      }
      
      // Get all votes for this poll by the user
      const votes = await storage.getUserPollVotes(pollId, user.id);
      const voteExists = votes.some(vote => vote.id === voteId);
      
      if (!voteExists) {
        return res.status(404).json({ message: 'Vote not found or not owned by you' });
      }
      
      const success = await storage.deletePollVote(voteId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete vote' });
      }
      
      // Get updated votes for the poll
      const updatedVotes = await storage.getPollVotes(pollId);
      
      // Create vote counts array
      const voteCounts = poll.options.map(() => 0);
      updatedVotes.forEach(vote => {
        if (vote.optionIndex >= 0 && vote.optionIndex < voteCounts.length) {
          voteCounts[vote.optionIndex]++;
        }
      });
      
      // Notify trip members about vote deletion via WebSocket
      broadcastToTrip(wss, poll.tripId, {
        type: 'POLL_VOTE_REMOVED',
        data: {
          pollId,
          voteId,
          voteCounts,
          totalVotes: updatedVotes.length
        }
      });
      
      res.json({
        success: true,
        pollVotes: updatedVotes,
        voteCounts,
        totalVotes: updatedVotes.length
      });
    } catch (error) {
      console.error('Error removing poll vote:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // PROFILE MANAGEMENT ROUTES
  
  // Update user profile
  // Budget Dashboard API - Get aggregated budget data for all user's trips
  router.get('/budget/dashboard', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      // Get all trips for the user
      const userTrips = await storage.getTripsByUser(user.id);
      const userMemberships = await storage.getTripMembershipsByUser(user.id);
      
      // Get all trip IDs where user is a member
      const memberTripIds = userMemberships.map(membership => membership.tripId);
      const allTripIds = [...new Set([...userTrips.map(trip => trip.id), ...memberTripIds])];
      
      // Fetch detailed trip data with budget information
      const tripsWithBudgets = await Promise.all(
        allTripIds.map(async (tripId) => {
          const trip = await storage.getTrip(tripId);
          if (!trip) return null;
          
          const members = await storage.getTripMembers(tripId);
          const memberCount = members.length;
          
          // Calculate trip duration
          const startDate = new Date(trip.startDate);
          const endDate = new Date(trip.endDate);
          const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Get activities with costs
          const activities = await storage.getActivitiesByTrip(tripId);
          const activitiesTotal = activities.reduce((sum, activity) => {
            return sum + (activity.cost ? parseFloat(activity.cost.toString()) : 0);
          }, 0);
          
          // Get expenses
          const expenses = await storage.getExpensesByTrip(tripId);
          const expensesTotal = expenses.reduce((sum, expense) => {
            return sum + (expense.amount || 0);
          }, 0);
          
          // Get flight information
          const flights = await storage.getFlightInfoByTrip(tripId);
          const flightsTotal = flights.reduce((sum, flight) => {
            return sum + (flight.price ? parseFloat(flight.price.toString()) : 0);
          }, 0);
          
          // Calculate estimated budget based on destination and duration
          // This would ideally come from saved budget estimates
          const estimatedBudget = {
            accommodation: duration * 80 * memberCount,
            food: duration * 50 * memberCount,
            transportation: duration * 30 * memberCount,
            activities: Math.max(activitiesTotal, duration * 40 * memberCount),
            incidentals: duration * 20 * memberCount,
            flights: Math.max(flightsTotal, 400 * memberCount)
          };
          
          const totalEstimated = Object.values(estimatedBudget).reduce((sum, val) => sum + val, 0);
          const totalActual = expensesTotal;
          
          return {
            tripId: trip.id,
            tripName: trip.name,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate,
            memberCount,
            duration,
            budgetData: {
              ...estimatedBudget,
              total: totalEstimated,
              actualSpent: totalActual,
              currency: 'USD'
            },
            status: endDate < new Date() ? 'past' : startDate <= new Date() ? 'ongoing' : 'upcoming'
          };
        })
      );
      
      const validTrips = tripsWithBudgets.filter(Boolean);
      res.json(validTrips);
      
    } catch (error) {
      console.error('Error fetching budget dashboard data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.put('/users/profile', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const { username, email, name, bio, location, venmoUsername, paypalEmail, hasSeenOnboarding } = req.body;
      
      // Debug: Check if name field is being received
      if (name !== undefined) {
        console.log('✅ Name field received:', name);
      } else {
        console.log('❌ Name field missing from request body');
      }

      // Validate payment methods if provided
      if (venmoUsername && !venmoUsername.startsWith('@')) {
        return res.status(400).json({ message: 'Venmo username must start with @' });
      }

      if (paypalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
        return res.status(400).json({ message: 'Please enter a valid PayPal email address' });
      }

      // Check if username or email already exists for other users
      if (username && username !== user.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: 'Username already taken' });
        }
      }

      if (email && email !== user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      // Update user profile
      const updatedUser = await storage.updateUser(user.id, {
        username: username || user.username,
        email: email || user.email,
        name: name || user.name,
        bio: bio || user.bio,
        location: location || user.location,
        venmoUsername: venmoUsername || null,
        paypalEmail: paypalEmail || null,
        hasSeenOnboarding: hasSeenOnboarding !== undefined ? hasSeenOnboarding : user.hasSeenOnboarding,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Change user password
  router.put('/users/password', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await storage.updateUser(user.id, { password: hashedNewPassword });

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Upload/update user avatar (expects { imageBase64: string })
  router.post('/users/avatar', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const { imageBase64 } = req.body as { imageBase64?: string };
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ message: 'imageBase64 is required' });
      }

      // If client sent a full data URL, store as-is; otherwise wrap as PNG data URL
      const isDataUrl = imageBase64.startsWith('data:');
      const dataUrl = isDataUrl ? imageBase64 : `data:image/png;base64,${imageBase64}`;

      // Store directly in DB so it persists across deploys
      const updatedUser = await storage.updateUser(user.id, { avatar: dataUrl });
      return res.json(updatedUser);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

  // Get user statistics
  router.get('/users/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      // Get user's trip memberships
      const memberships = await storage.getTripMembershipsByUser(user.id);
      const confirmedMemberships = memberships.filter(m => m.status === 'confirmed');
      
      // Get trip details for confirmed memberships
      const tripDetails = await Promise.all(
        confirmedMemberships.map(membership => storage.getTrip(membership.tripId))
      );
      
      const validTrips = tripDetails.filter(trip => trip !== null);
      
      // Calculate stats
      const totalTrips = validTrips.length;
      const now = new Date();
      const upcomingTrips = validTrips.filter(trip => 
        trip && new Date(trip.startDate) > now
      ).length;
      
      // Get unique travel companions
      const allTripMembers = await Promise.all(
        confirmedMemberships.map(membership => storage.getTripMembers(membership.tripId))
      );
      
      const companionIds = new Set();
      allTripMembers.flat().forEach(member => {
        if (member.userId !== user.id && member.status === 'confirmed') {
          companionIds.add(member.userId);
        }
      });

      res.json({
        totalTrips,
        upcomingTrips,
        companionsCount: companionIds.size,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Get other user's public profile
  router.get('/users/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if account is deleted - return 404 to show as ghost user
      if (user.deletedAt) {
        return res.status(404).json({ message: "User not found", deleted: true });
      }

      // Return public profile data (exclude sensitive info)
      const publicProfile = {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        createdAt: user.createdAt,
      };

      res.json(publicProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get user's public stats  
  router.get('/users/:userId/stats', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if account is deleted - return 404 to show as ghost user
      if (user.deletedAt) {
        return res.status(404).json({ message: "User not found", deleted: true });
      }

      const memberships = await storage.getTripMembershipsByUser(userId);
      const trips = await Promise.all(
        memberships.map(async (m: any) => {
          const trip = await storage.getTrip(m.tripId);
          return trip;
        })
      );

      const validTrips = trips.filter(trip => trip !== undefined);
      const upcomingTrips = validTrips.filter(trip => {
        const startDate = new Date(trip.startDate);
        return startDate > new Date();
      });

      // Get unique companions (users who have been on trips with this user)
      const companionIds = new Set<number>();
      for (const trip of validTrips) {
        const members = await storage.getTripMembers(trip.id);
        members.forEach((member: any) => {
          if (member.userId !== userId) {
            companionIds.add(member.userId);
          }
        });
      }

      const stats = {
        totalTrips: validTrips.length,
        upcomingTrips: upcomingTrips.length,
        companions: companionIds.size,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Trip image upload endpoints
  router.put('/trips/:id/image', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Only trip organizer can upload images
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: "Only the trip organizer can upload images" });
      }

      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ message: "No image provided" });
      }

      const updatedTrip = await storage.updateTrip(tripId, { cover: image });
      
      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(updatedTrip);
    } catch (error) {
      console.error("Error uploading trip image:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  router.delete('/trips/:id/image', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Only trip organizer can remove images
      if (trip.organizer !== user.id) {
        return res.status(403).json({ message: "Only the trip organizer can remove images" });
      }

      const updatedTrip = await storage.updateTrip(tripId, { cover: null });
      
      if (!updatedTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      res.json(updatedTrip);
    } catch (error) {
      console.error("Error removing trip image:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Expense tracking routes - rebuilt for activity integration
  router.post('/trips/:id/expenses', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const user = ensureUser(req, res);
      if (!user) return;
      
      const { title, amount, category, description, paidBy, splitWith } = req.body;
      
      console.log('Creating manual expense:', { title, amount, category, description, paidBy, splitWith });
      
      // Validate required fields
      if (!title || !amount || !paidBy || !splitWith) {
        console.log('Validation failed:', { title: !!title, amount: !!amount, paidBy: !!paidBy, splitWith: !!splitWith });
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Get trip members and validate that all expense participants have confirmed RSVP status
      const tripMembers = await storage.getTripMembers(tripId);
      const confirmedMemberIds = tripMembers
        .filter(member => member.rsvpStatus === 'confirmed')
        .map(member => member.userId);
      
      // Validate that payer has confirmed RSVP status
      if (!confirmedMemberIds.includes(parseInt(paidBy))) {
        return res.status(400).json({ message: "Expense payer must have confirmed RSVP status" });
      }
      
      // Filter splitWith to only include confirmed RSVP users
      const validSplitWith = splitWith.filter((userId: string) => 
        confirmedMemberIds.includes(parseInt(userId))
      );
      
      if (validSplitWith.length === 0) {
        return res.status(400).json({ message: "No confirmed members found for expense split" });
      }
      
      // Create the expense
      const expense = await storage.createExpense({
        tripId,
        title,
        amount: amount.toString(),
        currency: 'USD',
        category: category || 'food',
        description: description || null,
        paidBy: parseInt(paidBy),
        date: new Date(),
      });

      // Create expense splits for each confirmed person
      if (validSplitWith && validSplitWith.length > 0) {
        const amountPerPerson = parseFloat(amount) / validSplitWith.length;
        
        for (const userId of validSplitWith) {
          await db.insert(expenseSplits).values({
            expenseId: expense.id,
            userId: parseInt(userId),
            amount: amountPerPerson.toFixed(2),
            isPaid: false,
          });
        }
      }

      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  router.get('/trips/:id/expenses', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const expenses = await storage.getExpensesByTrip(tripId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  router.get('/trips/:id/expenses/balances', isAuthenticated, requireConfirmedRSVP, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      
      // Use the storage method that includes settlement adjustments
      const balances = await storage.calculateExpenseBalances(tripId);
      
      // Add cache control headers to prevent caching
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(balances);
    } catch (error) {
      console.error("Error calculating balances:", error);
      res.status(500).json({ message: "Failed to calculate balances" });
    }
  });

  // Get individual expense details
  router.get('/expenses/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const expenseId = parseInt(req.params.id);
      if (isNaN(expenseId)) {
        return res.status(400).json({ message: 'Invalid expense ID' });
      }

      const expense = await storage.getExpense(expenseId);
      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      // Check if user is a member of the trip this expense belongs to
      const members = await storage.getTripMembers(expense.tripId);
      const isMember = members.some(member => member.userId === user.id);
      
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this trip' });
      }

      res.json(expense);
    } catch (error) {
      console.error('Error fetching expense details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // TODO: Mark Paid endpoint removed - was non-functional
  // router.post('/expenses/:expenseId/shares/:shareId/mark-paid', isAuthenticated, async (req: Request, res: Response) => {
  //   try {
  //     const expenseId = parseInt(req.params.expenseId);
  //     const shareId = parseInt(req.params.shareId);
  //     
  //     await storage.markExpenseSharePaid(expenseId, shareId);
  //     res.json({ success: true });
  //   } catch (error) {
  //     console.error("Error marking expense share as paid:", error);
  //     res.status(500).json({ message: "Failed to mark as paid" });
  //   }
  // });

  // Settlement API routes
  router.post('/trips/:id/settlements/initiate', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      const { payeeId, amount, paymentMethod, notes } = req.body;

      if (isNaN(tripId) || !payeeId || !amount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get payee information for payment link generation
      const payee = await storage.getUser(payeeId);
      if (!payee) {
        return res.status(404).json({ message: "Payee not found" });
      }

      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      // Import settlement utilities
      const { getSettlementOptions } = await import('./settlement-utils');
      const settlementOptions = getSettlementOptions(payee, parseFloat(amount), user.name, trip.name);
      
      let paymentLink = null;
      if (paymentMethod && paymentMethod !== 'cash') {
        const selectedOption = settlementOptions.find(opt => opt.method === paymentMethod);
        paymentLink = selectedOption?.paymentLink || null;
      }

      const settlement = await storage.createSettlement({
        tripId,
        payerId: user.id,
        payeeId: parseInt(payeeId),
        amount: amount.toString(),
        currency: 'USD',
        paymentMethod: paymentMethod || null,
        paymentLink,
        notes: notes || null,
      });

      console.log("Settlement created:", {
        id: settlement.id,
        tripId: settlement.tripId,
        payerId: settlement.payerId,
        payeeId: settlement.payeeId,
        amount: settlement.amount,
        status: settlement.status,
        initiatedAt: settlement.initiatedAt
      });

      res.json(settlement);
    } catch (error) {
      console.error("Error initiating settlement:", error);
      res.status(500).json({ message: "Failed to initiate settlement" });
    }
  });

  router.get('/trips/:id/settlements', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parseInt(req.params.id);
      const settlements = await storage.getSettlementsByTrip(tripId);
      
      // Enhance with user information
      const enhancedSettlements = await Promise.all(
        settlements.map(async (settlement) => {
          const payer = await storage.getUser(settlement.payerId);
          const payee = await storage.getUser(settlement.payeeId);
          return {
            ...settlement,
            payerName: payer?.name || 'Unknown',
            payeeName: payee?.name || 'Unknown',
          };
        })
      );

      res.json(enhancedSettlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      res.status(500).json({ message: "Failed to fetch settlements" });
    }
  });

  router.post('/settlements/:id/confirm', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const settlementId = parseInt(req.params.id);
      const settlement = await storage.getSettlement(settlementId);

      if (!settlement) {
        return res.status(404).json({ message: "Settlement not found" });
      }

      // Only the payee can confirm receipt of payment
      if (settlement.payeeId !== user.id) {
        return res.status(403).json({ message: "Only the payee can confirm payment" });
      }

      if (settlement.status === 'confirmed') {
        return res.status(400).json({ message: "Settlement already confirmed" });
      }

      const confirmedSettlement = await storage.confirmSettlement(settlementId, user.id);
      res.json(confirmedSettlement);
    } catch (error) {
      console.error("Error confirming settlement:", error);
      res.status(500).json({ message: "Failed to confirm settlement" });
    }
  });

  router.post('/settlements/:id/reject', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const settlementId = parseInt(req.params.id);
      const settlement = await storage.getSettlement(settlementId);

      if (!settlement) {
        return res.status(404).json({ message: "Settlement not found" });
      }

      // Only the payee can reject payment
      if (settlement.payeeId !== user.id) {
        return res.status(403).json({ message: "Only the payee can reject payment" });
      }

      if (settlement.status === 'confirmed') {
        return res.status(400).json({ message: "Settlement already confirmed" });
      }

      if (settlement.status === 'rejected') {
        return res.status(400).json({ message: "Settlement already rejected" });
      }

      const rejectedSettlement = await storage.rejectSettlement(settlementId, user.id);
      res.json(rejectedSettlement);
    } catch (error) {
      console.error("Error rejecting settlement:", error);
      res.status(500).json({ message: "Failed to reject settlement" });
    }
  });

  router.get('/settlements/pending', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const pendingSettlements = await storage.getPendingSettlementsForUser(user.id);
      
      // Enhance with additional information
      const enhancedSettlements = await Promise.all(
        pendingSettlements.map(async (settlement) => {
          const payer = await storage.getUser(settlement.payerId);
          const trip = await storage.getTrip(settlement.tripId);
          return {
            ...settlement,
            payerName: payer?.name || payer?.username || 'Unknown',
            tripName: trip?.name || 'Unknown Trip',
          };
        })
      );

      res.json(enhancedSettlements);
    } catch (error) {
      console.error("Error fetching pending settlements:", error);
      res.status(500).json({ message: "Failed to fetch pending settlements" });
    }
  });

  // Get all trips where user has unsettled balances
  router.get('/user/unsettled-balances', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripsWithBalances = await (storage as any).getTripsWithUnsettledBalances(user.id);
      res.json(tripsWithBalances);
    } catch (error) {
      console.error("Error fetching unsettled balances:", error);
      res.status(500).json({ message: "Failed to fetch unsettled balances" });
    }
  });

  router.get('/trips/:id/settlement-options/:payeeId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.id);
      const payeeId = parseInt(req.params.payeeId);
      const { amount } = req.query;

      if (isNaN(tripId) || isNaN(payeeId)) {
        return res.status(400).json({ message: "Invalid trip ID or payee ID" });
      }

      // If amount is not provided or is invalid, try to get it from trip member data
      let paymentAmount = amount ? parseFloat(amount as string) : null;
      
      if (!paymentAmount || paymentAmount <= 0) {
        // Try to get the payment amount from the user's trip membership
        const members = await storage.getTripMembers(tripId);
        const member = members.find(m => m.userId === user.id);
        
        if (member && member.paymentAmount && parseFloat(member.paymentAmount) > 0) {
          paymentAmount = parseFloat(member.paymentAmount);
        } else {
          // Try to get from trip's down payment requirement
          const trip = await storage.getTrip(tripId);
          if (trip?.downPaymentAmount && parseFloat(trip.downPaymentAmount) > 0) {
            paymentAmount = parseFloat(trip.downPaymentAmount);
          } else {
            // Default to a minimal amount if no payment amount is found
            paymentAmount = 1.00;
          }
        }
      }

      const payee = await storage.getUser(payeeId);
      const trip = await storage.getTrip(tripId);

      if (!payee || !trip) {
        return res.status(404).json({ message: "Payee or trip not found" });
      }

      const { getSettlementOptions } = await import('./settlement-utils');
      const options = getSettlementOptions(payee, paymentAmount, user.name || user.username, trip.name);

      res.json(options);
    } catch (error) {
      console.error("Error getting settlement options:", error);
      res.status(500).json({ message: "Failed to get settlement options" });
    }
  });

  router.get('/settlements/:tripId/optimized', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.tripId);
      if (isNaN(tripId)) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }

      // Get current balances for the trip
      const balances = await storage.calculateExpenseBalances(tripId);
      
      if (!balances || balances.length === 0) {
        return res.json({
          transactions: [],
          stats: {
            totalTransactions: 0,
            totalAmount: 0,
            usersInvolved: 0,
            averageTransactionAmount: 0
          }
        });
      }

      // Import and run the settlement algorithm
      const { 
        calculateOptimizedSettlements, 
        validateSettlementPlan, 
        getSettlementStats 
      } = await import('./settlement-algorithm');
      
      const optimizedTransactions = calculateOptimizedSettlements(balances);
      const isValid = validateSettlementPlan(balances, optimizedTransactions);
      const stats = getSettlementStats(optimizedTransactions);

      if (!isValid) {
        console.warn(`Settlement plan validation failed for trip ${tripId}`);
      }

      res.json({
        transactions: optimizedTransactions,
        stats,
        isValid,
        originalBalances: balances
      });
    } catch (error) {
      console.error("Error calculating optimized settlements:", error);
      res.status(500).json({ message: "Failed to calculate optimized settlements" });
    }
  });

  router.get('/settlements/:tripId/user-recommendations/:userId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = ensureUser(req, res);
      if (!user) return;

      const tripId = parseInt(req.params.tripId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(tripId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid trip ID or user ID" });
      }

      // Only allow users to get their own recommendations unless they're trip organizer
      const trip = await storage.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      if (user.id !== userId && trip.organizer !== user.id) {
        return res.status(403).json({ message: "Not authorized to view these recommendations" });
      }

      const balances = await storage.calculateExpenseBalances(tripId);
      
      if (!balances || balances.length === 0) {
        return res.json({ recommendations: [] });
      }

      const { getUserSettlementRecommendations } = await import('./settlement-algorithm');
      const recommendations = getUserSettlementRecommendations(balances, userId);

      res.json({ recommendations });
    } catch (error) {
      console.error("Error getting user settlement recommendations:", error);
      res.status(500).json({ message: "Failed to get settlement recommendations" });
    }
  });

  // Email confirmation endpoint
  router.get('/auth/confirm-email', async (req: Request, res: Response) => {
    try {
      console.log('📧 Email confirmation request received:', { 
        query: req.query, 
        timestamp: new Date().toISOString() 
      });

      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        console.log('❌ Email confirmation failed: Invalid or missing token');
        return res.status(400).json({ message: 'Invalid or missing token' });
      }

      console.log(`📧 Looking up user with confirmation token: ${token.substring(0, 8)}...`);
      
      // Find user by token
      const user = await storage.getUserByEmailConfirmationToken(token);
      if (!user) {
        console.log(`❌ Email confirmation failed: Invalid token: ${token.substring(0, 8)}...`);
        
        // Let's also check if there are any users with email confirmation tokens at all
        const allUsers = await storage.getAllUsers();
        const usersWithTokens = allUsers.filter(u => u.emailConfirmationToken);
        console.log(`📧 Debug: Found ${usersWithTokens.length} users with email confirmation tokens`);
        usersWithTokens.forEach(u => {
          console.log(`📧 User ${u.username} (${u.email}) has token: ${u.emailConfirmationToken?.substring(0, 8)}...`);
        });
        
        return res.status(400).json({ message: 'Invalid or expired confirmation token' });
      }

      console.log(`📧 User found: ${user.username} (ID: ${user.id})`);

      // Check if email is already confirmed
      if (user.emailConfirmed) {
        console.log(`⚠️ Email already confirmed for user ${user.id}`);
        return res.status(400).json({ message: 'Email is already confirmed' });
      }

      // Mark email as confirmed and clear the token
      console.log(`📧 Confirming email for user ${user.id}...`);
      await storage.updateUser(user.id, {
        emailConfirmed: true,
        emailConfirmationToken: null
      });

      console.log(`✅ Email confirmed successfully for user ${user.id}`);
      res.json({ 
        message: 'Email confirmed successfully',
        username: user.username,
        email: user.email
      });
    } catch (error) {
      console.error('❌ Email confirmation error:', error);
      res.status(500).json({ message: 'Server error during email confirmation' });
    }
  });

  // Forgot password endpoint
  console.log('🔐 Registering forgot-password endpoint');
  router.post('/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      console.log('🔐 Forgot password request received:', { 
        body: req.body, 
        timestamp: new Date().toISOString(),
        headers: req.headers
      });

      const { email } = req.body;
      if (!email) {
        console.log('❌ Forgot password failed: No email provided');
        return res.status(400).json({ message: 'Email is required' });
      }

      // Check rate limiting
      if (isRateLimited(email)) {
        console.log(`🚫 Rate limited: ${email} has exceeded maximum attempts`);
        return res.status(429).json({ 
          message: 'Too many password reset attempts. Please try again later.',
          retryAfter: '1 hour'
        });
      }

      console.log(`🔐 Looking up user with email: ${email}`);
      console.log(`🔐 Storage object:`, typeof storage, storage ? 'exists' : 'null');
      const user = await storage.getUserByEmail(email);
      console.log(`🔐 User lookup result:`, user ? `Found user ${user.username}` : 'No user found');
      
      if (!user) {
        console.log(`🔐 No user found with email: ${email} (returning generic message for security)`);
        // Record attempt even for non-existent users to prevent email enumeration
        recordForgotPasswordAttempt(email);
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      }

      console.log(`🔐 User found: ${user.username} (ID: ${user.id})`);

      // Record successful attempt
      recordForgotPasswordAttempt(email);

      // Generate password reset token
      const resetToken = generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      console.log(`🔐 Generated reset token: ${resetToken.substring(0, 8)}...`);
      console.log(`🔐 Token expires at: ${resetExpires.toISOString()}`);

      // Update user with reset token
      console.log(`🔐 Updating user ${user.id} with reset token...`);
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      });
      console.log(`✅ User ${user.id} updated with reset token`);

      // Send password reset email
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      console.log(`🔐 Sending password reset email to: ${user.email}`);
      console.log(`🔐 Reset URL: ${resetUrl}`);
      
      const emailStartTime = Date.now(); // Move outside try block for scope
      console.log(`📧 [ROUTES] Starting email send at ${new Date().toISOString()}`);
      
      try {
        console.log(`🔐 About to send email to: ${user.email}`);
        console.log(`🔐 Email function:`, typeof sendEmail);
        console.log(`🔐 Reset URL: ${resetUrl}`);
        console.log(`🔐 User details:`, { id: user.id, name: user.name, email: user.email });
        
       await sendEmail(
        user.email,
        'Reset your Navigator password',
        `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #044674; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; color: #000000; }
              .button { display: inline-block; background: #044674; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .notice { background: #fff8e1; border: 1px solid #ffe082; padding: 15px; border-radius: 5px; margin: 20px 0; color: #000000; }
            </style>
          </head>
          <body>
            <div class="header">
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
              <div>
                <h1 style="margin: 0;">Navigator</h1>
                <p style="margin: 0;">The world is Waiting</p>
            </div>
            </div>
          </div>
      
            <div class="content">
            <h2>Hello ${user.name || ''},</h2>
              <p>We received a request to reset your password for your Navigator account.</p>
              <p>Click the button below to create a new password. This link will expire in <strong>1 hour</strong> for security reasons.</p>
              
              <div style="text-align: center;">
              <a href="${resetUrl}" class="button" style="display:inline-block;background:#044674;color:#ffffff !important;padding:15px 30px;text-decoration:none;border-radius:25px;font-weight:bold;margin:20px 0;">Reset My Password</a>
              </div>
              
            <div class="notice">
              <strong>Security Notice:</strong> If you didn't request a password reset, you can safely ignore this email. Your password will remain the same.
              </div>
              
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color:#000000;">${resetUrl}</p>
              
            <p>Tip: Use a strong, unique password to help keep your account secure.</p>
            </div>
      
            <div class="footer">
            <p>Navigator – Your travel planning companion</p>
              <p>© ${new Date().getFullYear()} Navigator. All rights reserved.</p>
            </div>
          </body>
          </html>
        `
      );
        
        const emailEndTime = Date.now();
        const emailDuration = emailEndTime - emailStartTime;
        console.log(`✅ [ROUTES] Email send completed successfully in ${emailDuration}ms`);
        console.log(`✅ Password reset email sent successfully to: ${user.email}`);
        
        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      } catch (emailError) {
        const emailEndTime = Date.now();
        const emailDuration = emailEndTime - emailStartTime;
        console.error(`❌ [ROUTES] Email send failed after ${emailDuration}ms`);
        console.error('❌ Failed to send password reset email:', emailError);
        console.error('❌ [ROUTES] Error details:', {
          message: emailError instanceof Error ? emailError.message : 'Unknown error',
          code: (emailError as any)?.code,
          command: (emailError as any)?.command,
          response: (emailError as any)?.response,
          stack: emailError instanceof Error ? emailError.stack?.substring(0, 300) + '...' : undefined
        });
        
        // Check if it's due to Gmail API configuration issues
        if (emailError instanceof Error && (
          emailError.message.includes('Gmail API not configured') ||
          emailError.message.includes('GOOGLE_SERVICE_ACCOUNT_EMAIL') ||
          emailError.message.includes('GOOGLE_SERVICE_ACCOUNT_KEY')
        )) {
          console.warn('⚠️ [ROUTES] Email functionality is disabled due to Gmail API configuration issues');
          console.warn('⚠️ [ROUTES] Gmail API environment variables not set');
          console.warn(`⚠️ [ROUTES] Providing reset URL directly to user: ${resetUrl}`);
          
          // Return the reset URL directly to the user
          res.json({ 
            message: 'Password reset link generated successfully. Please copy the link below as email delivery is currently unavailable.',
            resetUrl: resetUrl,
            note: 'This link will expire in 1 hour. Please copy and paste it into your browser.',
            emailStatus: 'failed',
            reason: 'Gmail API not configured - missing environment variables'
          });
        } else {
          // Re-throw other email errors
          throw emailError;
        }
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Reset password endpoint
  router.post('/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }

      // Validate password strength
      if(!passwordRules.test(password)) {
        return res.status(400).json({
          message: "Password must be at least 8 characters and include; Uppercase, Lowercase, number, and a special character"
        });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        console.log(`❌ Reset password failed: Invalid token: ${token.substring(0, 8)}...`);
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      console.log(`🔐 Reset password request for user: ${user.username} (ID: ${user.id})`);

      // Check if token has expired
      if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
        console.log(`❌ Reset password failed: Token expired for user ${user.id}`);
        // Clear expired token
        await storage.updateUser(user.id, {
          passwordResetToken: null,
          passwordResetExpires: null
        });
        return res.status(400).json({ message: 'Reset token has expired' });
      }

      console.log(`✅ Token validation successful for user ${user.id}`);

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user with new password and clear reset token
      console.log(`🔐 Updating password for user ${user.id}`);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      console.log(`✅ Password reset successful for user ${user.id}`);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Account recovery request endpoint
  router.post('/auth/recover-account/request', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ 
          message: 'If an account with that email exists and was deleted, a recovery email has been sent.' 
        });
      }

      // Check if account is actually deleted
      if (!user.deletedAt) {
        return res.json({ message: 'This account is not deleted. You can log in normally.' });
      }

      // Generate recovery token
      const recoveryToken = generateToken();
      const recoveryExpires = new Date();
      recoveryExpires.setDate(recoveryExpires.getDate() + 7); // 7 days expiration

      // Update user with recovery token
      await storage.updateUser(user.id, {
        accountRecoveryToken: recoveryToken,
        accountRecoveryExpires: recoveryExpires
      });

      // Send recovery email
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const recoveryUrl = `${frontendUrl}/recover-account?token=${recoveryToken}&email=${encodeURIComponent(email)}`;
      
      const emailSubject = 'Recover Your Navigator Account';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            Recover Your Account
          </h2>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #374151; line-height: 1.6;">
              We received a request to recover your Navigator account that was deleted on ${new Date(user.deletedAt).toLocaleDateString()}.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Click the button below to restore your account and regain access to all your trips and data.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${recoveryUrl}" 
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Recover Account
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link into your browser:<br>
            <a href="${recoveryUrl}" style="color: #2563eb; word-break: break-all;">${recoveryUrl}</a>
          </p>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>Security Note:</strong> This link will expire in 7 days. If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `;

      await sendEmail(user.email, emailSubject, emailHtml);

      console.log(`✅ Recovery email sent to ${email}`);
      res.json({ 
        message: 'Recovery email sent. Please check your inbox and click the link to restore your account.' 
      });
    } catch (error) {
      console.error('Recovery request error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Account recovery confirmation endpoint (GET - for validation)
  router.get('/auth/recover-account/confirm', async (req: Request, res: Response) => {
    try {
      const { token, email } = req.query;
      if (!token || !email) {
        return res.status(400).json({ message: 'Token and email are required' });
      }

      const user = await storage.getUserByEmail(email as string);
      if (!user) {
        return res.status(400).json({ message: 'Invalid recovery link' });
      }

      // Check if account is deleted
      if (!user.deletedAt) {
        return res.status(400).json({ message: 'This account is not deleted' });
      }

      // Check if token matches
      if (user.accountRecoveryToken !== token) {
        return res.status(400).json({ message: 'Invalid recovery token' });
      }

      // Check if token has expired
      if (user.accountRecoveryExpires && new Date() > user.accountRecoveryExpires) {
        return res.status(400).json({ message: 'Recovery link has expired. Please request a new one.' });
      }

      // Token is valid - return success (frontend will show confirmation page)
      res.json({ 
        valid: true,
        message: 'Recovery link is valid. You can proceed with account recovery.',
        deletedAt: user.deletedAt
      });
    } catch (error) {
      console.error('Recovery confirmation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Account recovery confirmation endpoint (POST - actually recovers account)
  router.post('/auth/recover-account/confirm', async (req: Request, res: Response) => {
    try {
      const { token, email } = req.body;
      if (!token || !email) {
        return res.status(400).json({ message: 'Token and email are required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid recovery link' });
      }

      // Check if account is deleted
      if (!user.deletedAt) {
        return res.status(400).json({ message: 'This account is not deleted' });
      }

      // Check if token matches
      if (user.accountRecoveryToken !== token) {
        return res.status(400).json({ message: 'Invalid recovery token' });
      }

      // Check if token has expired
      if (user.accountRecoveryExpires && new Date() > user.accountRecoveryExpires) {
        return res.status(400).json({ message: 'Recovery link has expired. Please request a new one.' });
      }

      // Recover the account - restore user and handle organizer status
      await (storage as any).restoreUserOnRecovery(user.id);

      console.log(`✅ Account recovered for user ${user.id}`);

      // Don't send password in response
      const { password: _, ...userWithoutPassword } = user;

      // Set session
      if (req.session) {
        req.session.userId = user.id;
      }

      // Generate token for frontend
      const authToken = `${user.id}_${generateToken()}`;

      res.json({
        message: 'Account recovered successfully',
        user: {
          ...userWithoutPassword,
          deletedAt: null, // Make sure it's cleared in response
          token: authToken
        }
      });
    } catch (error) {
      console.error('Recovery confirmation error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Resend email confirmation endpoint
  router.post('/auth/resend-confirmation', async (req: Request, res: Response) => {
    try {
      console.log('📧 Resend confirmation request received:', { 
        body: req.body, 
        timestamp: new Date().toISOString() 
      });

      const { email } = req.body;
      if (!email) {
        console.log('❌ Resend confirmation failed: No email provided');
        return res.status(400).json({ message: 'Email is required' });
      }

      console.log(`📧 Looking up user with email: ${email}`);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log(`📧 No user found with email: ${email} (returning generic message for security)`);
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account with that email exists, a confirmation email has been sent.' });
      }

      if (user.emailConfirmed) {
        console.log(`📧 User ${user.id} already confirmed their email`);
        return res.json({ message: 'Email is already confirmed' });
      }

      // Generate new confirmation token
      const newToken = generateToken();
      console.log(`📧 Generated new confirmation token: ${newToken.substring(0, 8)}...`);

      // Update user with new token
      await storage.updateUser(user.id, {
        emailConfirmationToken: newToken
      });

      // Send new confirmation email
      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/confirm-email?token=${newToken}`;
      console.log(`📧 Sending new confirmation email to: ${user.email}`);
      
      try {
        await sendEmail(
          user.email,
          'Confirm your Navigator email - New link',
          `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Your Email</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #044674; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #044674; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .info { background: #eef6ff; border: 1px solid #cde0ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">
             <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                <div>
                  <h1 style="margin: 0;">Navigator</h1>
                  <p style="margin: 0;">The world is waiting</p>
            </div>
              </div>
            </div>
        
            <div class="content">
              <h2>Hello ${user.name || ''},</h2>
              <p>We've sent you a new confirmation link for your Navigator account.</p>
              
              <div class="info">
                Please confirm your email address by clicking the button below.
              </div>
              
              <div style="text-align: center;">
                <a href="${confirmUrl}" class="button" style="color: white;">Confirm My Email</a>
              </div>
              
              <p>If the button above doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color:rgb(255, 255, 255);">${confirmUrl}</p>
              
              <p>This link will expire in <strong>24 hours</strong> for security reasons.</p>
              <p>If you need help, please contact our support team.</p>
            </div>
        
            <div class="footer">
              <p>Navigator – Your travel planning companion</p>
              <p>© ${new Date().getFullYear()} Navigator. All rights reserved.</p>
            </div>
          </body>
          </html>
          `
        );
// ... existing code ...
        
        
        console.log(`✅ New confirmation email sent successfully to: ${user.email}`);
        res.json({ message: 'Confirmation email sent successfully' });
      } catch (emailError) {
        console.error('❌ Failed to send new confirmation email:', emailError);
        
        if (emailError instanceof Error && emailError.message.includes('SMTP not configured')) {
          console.warn('⚠️ Email functionality is disabled - returning confirmation URL in response');
          res.json({ 
            message: 'Email functionality is currently disabled. Here is your confirmation link:',
            confirmationUrl: confirmUrl
          });
        } else {
          res.status(500).json({ message: 'Failed to send confirmation email' });
        }
      }
    } catch (error) {
      console.error('❌ Resend confirmation error:', error);
      res.status(500).json({ message: 'Server error during resend confirmation' });
    }
  });

  // Check email confirmation status
  router.get('/auth/email-status', async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email parameter is required' });
      }

      console.log(`📧 Checking email confirmation status for: ${email}`);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        email: user.email,
        emailConfirmed: user.emailConfirmed,
        username: user.username,
        name: user.name
      });
    } catch (error) {
      console.error('❌ Email status check error:', error);
      res.status(500).json({ message: 'Server error during email status check' });
    }
  });


  // Google OAuth Routes
  router.get('/auth/google', (req: Request, res: Response, next: NextFunction) => {
    console.log('🔍 Google OAuth request received');
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Request origin:', req.headers.origin);
    console.log('🔍 Request referer:', req.headers.referer);
    console.log('🔍 Environment check:', {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
      BACKEND_URL: process.env.BACKEND_URL || '❌ Missing',
      FRONTEND_URL: process.env.FRONTEND_URL || '❌ Missing'
    });
    
    // Check if Google OAuth is properly configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ Google OAuth not configured properly');
      return res.status(500).json({ 
        error: 'Google OAuth not configured',
        message: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables'
      });
    }
    
    console.log('✅ Google OAuth configured, proceeding with authentication...');
    next();
  }, passport.authenticate('google', { scope: ['profile', 'email'] }));


  // OAuth token validation endpoint
  // OAuth test endpoint (for frontend connectivity checks)
  router.get('/auth/oauth/test', async (req: Request, res: Response) => {
    try {
      res.json({ message: 'OAuth backend is reachable', status: 'ok' });
    } catch (error) {
      console.error('OAuth test error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/auth/oauth/validate', async (req: Request, res: Response) => {
    try {
      const { oauthToken, userId } = req.body;
      
      console.log('🔍 OAuth token validation request received');
      console.log('🔍 Request body:', req.body);
      console.log('🔍 oauthToken:', oauthToken);
      console.log('🔍 userId:', userId);
      
      if (!oauthToken || !userId) {
        console.log('❌ Missing oauthToken or userId');
        return res.status(400).json({ error: 'Missing oauthToken or userId' });
      }

      console.log('🔍 OAuth token validation request:', { oauthToken, userId });

      // Check if the token format matches our OAuth pattern
      if (!oauthToken.includes('_oauth_temp')) {
        console.log('❌ Invalid OAuth token format:', oauthToken);
        return res.status(400).json({ error: 'Invalid OAuth token format' });
      }

      // Extract user ID from token
      const tokenUserId = oauthToken.split('_')[0];
      console.log('🔍 Extracted userId from token:', tokenUserId);
      
      if (tokenUserId !== userId.toString()) {
        console.log('❌ Token and user ID mismatch:', { tokenUserId, userId });
        return res.status(400).json({ error: 'Token and user ID mismatch' });
      }

      // Get user from database
      console.log('🔍 Looking up user in database with ID:', userId);
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        console.log('❌ User not found in database for ID:', userId);
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('✅ User found in database:', user.username);

      // Generate a token using the same format as the login endpoint
      const token = `${user.id}`;
      
      // Set up the user session for future requests
      if (req.session) {
        req.session.userId = user.id;
        console.log('✅ User session set up in OAuth validation:', req.session.userId);
      }
      
      console.log('✅ OAuth token validation successful for user:', user.username);
      console.log('✅ Generated new token:', token);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        },
        token: token
      });
      
    } catch (error) {
      console.error('❌ Error in OAuth token validation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/auth/google/callback', 
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('google', (err: any, user: any, info: any) => {
        if (err) {
          console.error('❌ OAuth authentication error:', err);
          // Check if error is about deleted account
          if (err.message === 'ACCOUNT_DELETED') {
            const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://navigator-update.vercel.app';
            console.log('🔍 Redirecting deleted account to recovery page');
            return res.redirect(302, `${frontendUrl}/recover-account?oauth_deleted=true`);
          }
          const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://navigator-update.vercel.app';
          return res.redirect(302, `${frontendUrl}/login?error=oauth_failed`);
        }
        if (!user) {
          console.error('❌ No user object in OAuth callback');
          const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://navigator-update.vercel.app';
          return res.redirect(302, `${frontendUrl}/login?error=oauth_failed`);
        }
        // User is authenticated, continue to next handler
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error('❌ Error logging in user:', loginErr);
            const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://navigator-update.vercel.app';
            return res.redirect(302, `${frontendUrl}/login?error=oauth_failed`);
          }
          next();
        });
      })(req, res, next);
    },
    (req: Request, res: Response) => {
      try {
        console.log('🎯 Google OAuth callback reached');
        console.log('🔍 Request headers:', req.headers);
        console.log('🔍 Request user:', req.user);
        console.log('🔍 Session ID:', req.sessionID);
        console.log('🔍 Session data:', req.session);
        
        // Check if user is properly authenticated
        if (!req.user) {
          console.error('❌ No user object in OAuth callback');
          return res.redirect(302, `${process.env.FRONTEND_URL || 'https://navigator-update.vercel.app'}/login?error=oauth_failed`);
        }
        
        // Set up the user session properly and wait for it to be established
        if (req.session) {
          req.session.userId = req.user.id;
          console.log('✅ User session set up:', req.session.userId);
          
          // Save the session to ensure it's persisted
          req.session.save((err) => {
            if (err) {
              console.error('❌ Error saving session:', err);
            } else {
              console.log('✅ Session saved successfully');
            }
          });
        }
        
        // Add a small delay to ensure session is fully established
        console.log('⏳ Waiting for session to be fully established...');
        
        // Successful authentication, redirect to frontend dashboard with user ID
        const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://navigatortrips.com';
        console.log('🔐 Frontend URL:', frontendUrl);
        console.log('🔍 Environment variables check:', {
          FRONTEND_URL: process.env.FRONTEND_URL,
          CLIENT_URL: process.env.CLIENT_URL,
          fallback: 'https://navigatortrips.com'
        });
        
        // Create a temporary token for OAuth users
        const tempToken = `${req.user.id}_oauth_temp`;
        console.log('🔑 Generated temporary token:', tempToken);
        console.log('🔍 User object for OAuth:', {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email
        });
        
        // Redirect to frontend dashboard with temporary token (use /dashboard, not /home)
        const redirectUrl = `${frontendUrl}/dashboard?oauth_token=${tempToken}&user_id=${req.user.id}`;
        console.log('🚀 Final redirect URL:', redirectUrl);
        console.log('🔍 OAuth flow summary:', {
          step: 'callback_complete',
          userAuthenticated: !!req.user,
          sessionId: req.sessionID,
          redirectingTo: redirectUrl
        });
        
        // Set headers to ensure redirect works
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        console.log('🔄 Redirecting to frontend with OAuth token...');
        console.log('🔄 Redirect status: 302');
        console.log('🔄 Redirect target:', redirectUrl);
        
        // Try to redirect and log any errors
        try {
          res.redirect(302, redirectUrl);
        } catch (redirectError) {
          console.error('❌ Redirect error:', redirectError);
          // Fallback: send JSON response with redirect info
          res.json({
            success: true,
            message: 'OAuth successful, please redirect manually',
            redirectUrl: redirectUrl,
            oauthToken: tempToken,
            userId: req.user.id
          });
        }
      } catch (error) {
        console.error('❌ Error in Google OAuth callback:', error);
        // Fallback redirect to homepage
        const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://navigator-update.vercel.app';
        console.log('🔄 Fallback redirect to:', `${frontendUrl}/`);
        res.redirect(302, `${frontendUrl}/?error=oauth_error`);
      }
    }
  );

  // AIRPORT RECOMMENDATIONS ROUTES
  
  // Get airport recommendations based on user location and destination
  router.post('/airport-recommendations', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { userLocation, destination } = req.body;
      
      if (!userLocation || !destination) {
        return res.status(400).json({ 
          error: 'User location and destination are required' 
        });
      }

      if (!userLocation.latitude || !userLocation.longitude) {
        return res.status(400).json({ 
          error: 'User location must include latitude and longitude' 
        });
      }

      if (!destination.latitude || !destination.longitude) {
        return res.status(400).json({ 
          error: 'Destination must include latitude and longitude' 
        });
      }

      const { getAirportRecommendations } = await import('./airport-recommendations');
      const recommendations = await getAirportRecommendations(
        userLocation,
        destination,
        req.body.maxResults || 5
      );

      res.json({ recommendations });
    } catch (error: any) {
      console.error('❌ Airport recommendations error:', error);
      res.status(500).json({ 
        error: 'Failed to get airport recommendations',
        message: error.message 
      });
    }
  });

  // Get nearby airports for a location
  router.get('/airports/nearby', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = 200 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ 
          error: 'Latitude and longitude are required' 
        });
      }

      const { findNearbyAirports } = await import('./airport-recommendations');
      const airports = await findNearbyAirports(
        { latitude: parseFloat(lat as string), longitude: parseFloat(lng as string) },
        parseInt(radius as string)
      );

      res.json({ airports });
    } catch (error: any) {
      console.error('❌ Nearby airports error:', error);
      res.status(500).json({ 
        error: 'Failed to find nearby airports',
        message: error.message 
      });
    }
  });

  // Get airport details
  router.get('/airports/:placeId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { placeId } = req.params;
      
      if (!placeId) {
        return res.status(400).json({ 
          error: 'Place ID is required' 
        });
      }

      const { getAirportDetails } = await import('./airport-recommendations');
      const airport = await getAirportDetails(placeId);

      if (!airport) {
        return res.status(404).json({ 
          error: 'Airport not found' 
        });
      }

      res.json({ airport });
    } catch (error: any) {
      console.error('❌ Airport details error:', error);
      res.status(500).json({ 
        error: 'Failed to get airport details',
        message: error.message 
      });
    }
  });

  // Health check for airport recommendations service
  router.get('/airport-recommendations/status', async (req: Request, res: Response) => {
    try {
      const { getAirportRecommendationsStatus } = await import('./airport-recommendations');
      const status = getAirportRecommendationsStatus();
      res.json(status);
    } catch (error: any) {
      console.error('❌ Airport recommendations status error:', error);
      res.status(500).json({ 
        error: 'Failed to check airport recommendations status',
        message: error.message 
      });
    }
  });

  // Debug endpoint to see all airports found near a location
  router.get('/airports/debug', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = 100 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ 
          error: 'Latitude and longitude are required' 
        });
      }

      const { findNearbyAirports } = await import('./airport-recommendations');
      const airports = await findNearbyAirports(
        { latitude: parseFloat(lat as string), longitude: parseFloat(lng as string) },
        parseInt(radius as string)
      );

      // Calculate distances for debugging
      const airportsWithDistance = airports.map(airport => {
        const distance = Math.sqrt(
          Math.pow(airport.geometry.location.lat - parseFloat(lat as string), 2) +
          Math.pow(airport.geometry.location.lng - parseFloat(lng as string), 2)
        ) * 111; // Rough km conversion
        
        return {
          ...airport,
          distance_km: distance.toFixed(2)
        };
      });

      res.json({ 
        airports: airportsWithDistance,
        count: airports.length,
        userLocation: { lat, lng },
        searchRadius: radius
      });
    } catch (error: any) {
      console.error('❌ Airport debug error:', error);
      res.status(500).json({ 
        error: 'Failed to debug airports',
        message: error.message 
      });
    }
  });

  app.use('/api', router);
  
  return httpServer;
}

// Augment Express Request to include user and session
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}
