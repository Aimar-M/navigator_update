import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "dotenv";
import cors from "cors";

config();

console.log('🚀 Starting server...');
console.log('📁 Current directory:', process.cwd());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔧 Port:', process.env.PORT || '5000');

const app = express();

app.use(express.json()); // <-- Make sure this is before CORS

const API_BASE = import.meta.env.VITE_API_URL || '';

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://navigator-update.vercel.app",
    "https://navigator-update-git-main-aimar-ms-projects.vercel.app",
    "https://navigator-update-1zbs9iahz-aimar-ms-projects.vercel.app",
    // Allow all origins in development
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:*'] : [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204, // <-- Add this line
}));

app.options('*', cors()); // <-- Add this line

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log all requests for debugging
  console.log(`📥 ${req.method} ${path} - ${req.get('User-Agent') || 'Unknown'}`);

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('🔧 Setting up routes...');
    const server = await registerRoutes(app);

    // 404 handler for unmatched routes
    app.use('*', (req: Request, res: Response) => {
      console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        message: 'Route not found', 
        path: req.originalUrl,
        method: req.method,
        availableRoutes: [`${API_BASE}/api/health`, `${API_BASE}/api/auth/login`, `${API_BASE}/api/auth/register`]
      });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      console.log('🔧 Setting up Vite for development...');
      await setupVite(app, server);
    } else {
      console.log('🔧 Setting up static file serving for production...');
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = process.env.PORT || 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🚀 Server running on port ${port}`);
      log(`📡 API available at http://0.0.0.0:${port}/api`);
      log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
})();
