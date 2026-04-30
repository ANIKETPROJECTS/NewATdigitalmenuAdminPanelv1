import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const app = express();
// Set high limits for image uploads (base64 makes files larger)
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Disable HTTP caching in development so the workspace preview iframe
// always loads the latest HTML/JS (prevents stale "blank screen" issues).
if (process.env.NODE_ENV !== "production") {
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
  });
}

// Enhanced logging middleware
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
      let logLine = `[API Request] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: Response Body: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "… (truncated)";
      }

      log(logLine);
    }
  });

  next();
});

// Function to kill process using a specific port (Linux compatible)
async function killPortProcess(port: number): Promise<void> {
  try {
    log(`🔍 Checking if port ${port} is in use...`);
    
    // Find process using the port (Linux compatible)
    try {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      
      if (stdout.trim()) {
        const pids = stdout.trim().split('\n').filter(pid => pid.trim());
        
        if (pids.length > 0) {
          log(`⚡ Found ${pids.length} process(es) using port ${port}. Killing them...`);
          
          for (const pid of pids) {
            try {
              await execAsync(`kill -9 ${pid.trim()}`);
              log(`✅ Killed process with PID ${pid.trim()}`);
            } catch (error) {
              log(`⚠️  Could not kill process ${pid.trim()}: ${error}`);
            }
          }
          
          // Wait a moment for processes to fully terminate
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        log(`✅ Port ${port} is available`);
      }
    } catch (lsofError) {
      // Fallback: try netstat for Linux
      try {
        const { stdout } = await execAsync(`netstat -tlnp | grep :${port}`);
        if (stdout.trim()) {
          log(`⚡ Port ${port} appears to be in use (netstat check)`);
        } else {
          log(`✅ Port ${port} is available (netstat check)`);
        }
      } catch (netstatError) {
        log(`⚠️  Could not check port ${port} with lsof or netstat, continuing...`);
      }
    }
  } catch (error) {
    log(`⚠️  Error checking port ${port}: ${error}`);
  }
}

// Function to check if port is still in use (Linux compatible)
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    return stdout.trim().length > 0;
  } catch {
    // Fallback to netstat
    try {
      const { stdout } = await execAsync(`netstat -tlnp | grep :${port}`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }
}

// Simplified server startup for Replit environment
async function startServer(port: number): Promise<void> {
  try {
    log(`🚀 Starting server initialization on port ${port}`);
    
    // Add static file serving for uploads
    app.use("/uploads", express.static("uploads"));
    
    // Set up routes
    log("📝 Registering API routes...");
    const server = await registerRoutes(app);
    log("✅ API routes registered successfully");

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`❌ Server Error [${status}]: ${message}`);
      if (err.stack) {
        log(`📜 Stack trace: ${err.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      res.status(status).json({ message });
    });

    // Setup vite or static serving
    if (app.get("env") === "development") {
      log("🛠️  Setting up Vite for development mode...");
      await setupVite(app, server);
      log("✅ Vite setup complete");
    } else {
      log("📦 Setting up static file serving for production mode...");
      serveStatic(app);
      log("✅ Static serving setup complete");
    }

    // Start the server
    server.listen(port, "0.0.0.0", () => {
      log(`🎉 SUCCESS: Server is listening on 0.0.0.0:${port}`);
    });
    
  } catch (error) {
    log(`❌ FATAL ERROR during server startup: ${error}`);
    if (error instanceof Error && error.stack) {
      log(`📜 Fatal Stack trace: ${error.stack}`);
    }
    throw error;
  }
}

// Legacy function kept for compatibility
async function startServerWithPortKill(port: number, maxRetries: number = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`🚀 Attempt ${attempt} to start server on port ${port}`);
      
      // Simplified approach - just try to start directly
      if (attempt > 1) {
        await killPortProcess(port);
      }
      
      // Try to start the server
      const server = await registerRoutes(app);

      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        res.status(status).json({ message });
        throw err;
      });

      // Setup vite or static serving
      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

      // Start the server
      return new Promise((resolve, reject) => {
        server.listen(port, "0.0.0.0", () => {
          log(`✅ Server successfully started on port ${port}`);
          resolve();
        });

        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE') {
            log(`❌ Port ${port} is still in use (attempt ${attempt})`);
            if (attempt < maxRetries) {
              reject(new Error(`Port ${port} in use, retrying...`));
            } else {
              log(`💡 All attempts failed. Try manually:`);
              log(`   netstat -ano | findstr :${port}`);
              log(`   taskkill /PID <PID> /F`);
              reject(err);
            }
          } else {
            reject(err);
          }
        });
      });

    } catch (error) {
      if (attempt < maxRetries) {
        log(`⚠️  Attempt ${attempt} failed: ${error}`);
        log(`⏳ Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        throw error;
      }
    }
  }
}

// Main startup function
(async () => {
  try {
    const port = parseInt(process.env.PORT || '5000', 10);
    await startServer(port);
  } catch (error) {
    log(`❌ Failed to start server: ${error}`);
    process.exit(1);
  }
})();