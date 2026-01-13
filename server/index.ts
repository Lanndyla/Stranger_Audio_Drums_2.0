import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// CORS middleware for external API access (JUCE plugin, etc.)
app.use((req, res, next) => {
  // Allow requests from any origin for API routes (no credentials mode)
  if (req.path.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }
  next();
});

// API Key authentication middleware for external access
const STRANGER_DRUMS_API_KEY = process.env.STRANGER_DRUMS_API_KEY;

app.use((req, res, next) => {
  // Skip auth for docs endpoint and OPTIONS preflight
  if (req.path === '/api/docs' || req.method === 'OPTIONS') {
    return next();
  }
  
  // Only protect API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  // If no API key is configured, allow all requests (development mode)
  if (!STRANGER_DRUMS_API_KEY) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] as string;
  const origin = req.headers.origin;
  const host = req.get('host') || '';
  
  // Check if request is same-origin (browser UI on same host)
  // Origin header will match the host for same-origin requests
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host; // includes port
      
      // Allow only exact same-origin match
      if (originHost === host) {
        return next();
      }
    } catch (e) {
      // Invalid origin URL, fall through to API key check
    }
  }
  
  // For all other requests (external, cross-origin), require API key
  if (!apiKey || apiKey !== STRANGER_DRUMS_API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Valid X-API-Key header required for external API access' 
    });
  }
  
  next();
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
