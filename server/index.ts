import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "dotenv";
import cors from "cors";
import passport from "./google-auth";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { preWarmEmailConnection } from "./email";
import path from "path";
import fs from "fs";
import { safeErrorLog } from "./error-logger";

config();

console.log('🚀 Starting server...');
console.log('📁 Current directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'production');
console.log('🔧 Port:', process.env.PORT || '5000');

const app = express();

// Trust proxy for proper cookie handling behind reverse proxy (Railway, etc.)
app.set("trust proxy", 1);

app.use(express.json({ limit: '10mb' })); // <-- Increased limit for large image uploads

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://navigator-update.vercel.app",
    "https://navigator-update-git-main-aimar-ms-projects.vercel.app",
    "https://navigator-update-1zbs9iahz-aimar-ms-projects.vercel.app",
    "https://navigatorupdate-production.up.railway.app",
    "https://navigatortrips.com",
    // Allow all origins in production
    ...(process.env.NODE_ENV === 'production' ? [] : [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
}));

app.options('*', cors()); // <-- Add this line

// Note: Images are now stored as base64 in database for persistence across redeploys
// Removed static file serving to avoid file system dependencies

// Configure session middleware with PostgreSQL store
// Detect production environment: if not explicitly development, assume production
// This ensures cookies work correctly even if NODE_ENV is not set in Railway
const isProduction = process.env.NODE_ENV !== 'development';
console.log('🔧 Production mode detected:', isProduction, '(NODE_ENV:', process.env.NODE_ENV, ')');

const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, // true for HTTPS in production, false for HTTP in development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none', // Allow cross-site cookies for OAuth
    domain: isProduction ? '.navigatortrips.com' : undefined // Allow subdomain sharing between navigatortrips.com and api.navigatortrips.com
  }
}));

// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

// Request/response logging removed - was too verbose for production
// If needed for debugging, add back with NODE_ENV === 'development' check

(async () => {
  try {
    // Sitemap.xml endpoint for SEO (must be at root level, not under /api)
    app.get('/sitemap.xml', (req: Request, res: Response) => {
      const baseUrl = 'https://navigatortrips.com';
      const currentDate = new Date().toISOString().split('T')[0];
      
      const publicPages = [
        { path: '/', priority: '1.0', changefreq: 'weekly' },
        { path: '/about', priority: '0.8', changefreq: 'monthly' },
        { path: '/contact', priority: '0.7', changefreq: 'monthly' },
        { path: '/terms', priority: '0.5', changefreq: 'yearly' },
        { path: '/privacy', priority: '0.5', changefreq: 'yearly' },
        { path: '/legal', priority: '0.5', changefreq: 'yearly' },
      ];

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPages.map(page => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.status(200).send(sitemap);
    });

    // Robots.txt endpoint for SEO (must be at root level)
    app.get('/robots.txt', (req: Request, res: Response) => {
      const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Allow: /api/og
Disallow: /dashboard
Disallow: /home
Disallow: /account-settings
Disallow: /profile
Disallow: /trips/
Disallow: /chats
Disallow: /create-trip
Disallow: /invite/
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /confirm-email
Disallow: /recover-account
Disallow: /airport-test

# Sitemap
Sitemap: https://navigatortrips.com/sitemap.xml
`;
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(robotsTxt);
    });

    // OG Image generation endpoint (must be at root level for social media crawlers)
    app.get('/api/og', async (req: Request, res: Response) => {
      const { generateOGImage } = await import('./og-image.js');
      await generateOGImage(req, res);
    });

    // Serve OG image with proper headers to avoid 206 Partial Content errors
    // Facebook/WhatsApp crawlers don't handle Range requests well
    app.get('/og-image.png', (req: Request, res: Response) => {
      // Try production path first (dist/public), then fallback to client/public (dev)
      const distPath = path.resolve(__dirname, '../dist/public/og-image.png');
      const devPath = path.resolve(__dirname, '../client/public/og-image.png');
      const ogImagePath = fs.existsSync(distPath) ? distPath : devPath;
      
      if (!fs.existsSync(ogImagePath)) {
        console.error('OG image not found at:', ogImagePath);
        return res.status(404).json({ error: 'OG image not found' });
      }
      
      // Disable range requests for OG images (prevents 206 errors)
      // This ensures Facebook/WhatsApp crawlers get a full 200 response
      delete req.headers.range;
      
      // Set proper headers for social media crawlers
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Accept-Ranges', 'none'); // Explicitly disable range requests
      res.setHeader('Content-Length', fs.statSync(ogImagePath).size);
      
      // Read and send file directly to avoid Express static middleware's range handling
      const fileStream = fs.createReadStream(ogImagePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (err) => {
        console.error('Error serving OG image:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error serving OG image' });
        }
      });
    });

    console.log('🔧 Setting up routes...');
    const server = await registerRoutes(app);

    // Setup cleanup for expired password reset tokens
    console.log('🧹 Setting up cleanup for expired tokens...');
    const cleanupExpiredTokens = async () => {
      try {
        // Import storage to access the cleanup method
        const { storage } = await import('./db-storage');
        console.log('🧹 Cleaning up expired password reset tokens...');
        const cleanedCount = await storage.cleanupExpiredPasswordResetTokens();
        console.log(`✅ Token cleanup completed. Cleaned ${cleanedCount} expired tokens.`);
        return cleanedCount;
      } catch (error) {
        safeErrorLog('❌ Error during token cleanup', error);
        return 0;
      }
    };

    const cleanupExpiredEmailConfirmationTokens = async () => {
      try {
        const { storage } = await import('./db-storage');
        console.log('🧹 Cleaning up expired email confirmation tokens...');
        const cleanedCount = await storage.cleanupExpiredEmailConfirmationTokens();
        console.log(`✅ Email confirmation token cleanup completed. Cleaned ${cleanedCount} expired tokens.`);
        return cleanedCount;
      } catch (error) {
        safeErrorLog('❌ Error during email confirmation token cleanup', error);
        return 0;
      }
    };

    // Auto-archive trips task (per-user settings) once they end
    const autoArchivePastTrips = async () => {
      try {
        const { storage } = await import('./db-storage');
        const users = await storage.getAllUsers();
        for (const u of users) {
          try {
            await storage.autoArchivePastTripsForUser(u.id);
          } catch {}
        }
      } catch (error) {
        safeErrorLog('❌ Error during auto-archive task', error);
      }
    };

    // Cleanup expired tokens every hour; Auto-archive every 6 hours
    setInterval(async () => {
      try {
        await cleanupExpiredTokens();
        await cleanupExpiredEmailConfirmationTokens();
        await autoArchivePastTrips();
      } catch (error) {
        safeErrorLog('❌ Error during token cleanup', error);
      }
    }, 60 * 60 * 1000); // Every hour

    // Run cleanup once on startup
    cleanupExpiredTokens().catch((error) => safeErrorLog('Startup token cleanup error', error));
    cleanupExpiredEmailConfirmationTokens().catch((error) => safeErrorLog('Startup email token cleanup error', error));
    autoArchivePastTrips().catch((error) => safeErrorLog('Startup auto-archive error', error));

    // 404 handler for unmatched routes
    app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ 
        message: 'Route not found', 
        path: req.originalUrl,
        method: req.method,
        availableRoutes: ["/api/health", "/api/auth/login", "/api/auth/register"]
      });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log error safely without throwing (which would cause unhandled rejection)
      safeErrorLog('Unhandled error in request handler', err);
      res.status(status).json({ message });
    });

    // Setup Vite for development, static files for production
    if (process.env.NODE_ENV === "development") {
      console.log('🔧 Setting up Vite for development...');
      await setupVite(app, server);
    } else {
      console.log('🔧 Setting up static file serving for production...');
      serveStatic(app);
    }

    // Use port 3000 for development, 5000 for production
    const port = process.env.NODE_ENV === "development" ? 3000 : (process.env.PORT || 5000);
    server.listen({
      port,
      host: "0.0.0.0",
    }, async () => {
      log(`🚀 Server running on port ${port}`);
      log(`📡 API available at http://0.0.0.0:${port}/api`);
      
      // Skip email pre-warming for fastest startup
      console.log('📧 Email ready for immediate sending');
    });
  } catch (error) {
    safeErrorLog('Error starting server', error);
    process.exit(1);
  }
})();