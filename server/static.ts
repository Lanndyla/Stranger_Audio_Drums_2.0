import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export function serveStatic(app: Express) {
  // Get the directory where this file is located
  let distPath: string;
  
  try {
    // Try using import.meta for ESM
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    distPath = path.resolve(__dirname, "..", "public");
  } catch {
    // Fallback for CommonJS in bundled version
    distPath = path.join(process.cwd(), "dist", "public");
  }
  
  if (!fs.existsSync(distPath)) {
    console.error(`Static files directory not found: ${distPath}`);
    console.error(`Current working directory: ${process.cwd()}`);
    console.error(`Files in dist:`, fs.readdirSync(path.join(process.cwd(), "dist")).catch(() => []));
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files with proper cache headers
  app.use(express.static(distPath, {
    etag: false,
    maxAge: '1h',
  }));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
