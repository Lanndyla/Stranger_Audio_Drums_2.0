import { createServer } from "http";
import express from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/static";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
await registerRoutes(httpServer, app);

// Serve static files
serveStatic(app);

// Export for Vercel
export default async (req: VercelRequest, res: VercelResponse) => {
  // Handle the request through Express
  return new Promise((resolve) => {
    app(req, res);
    res.on("finish", resolve);
  });
};
