import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Import API routes
import userRoutes from "./server/routes/userRoutes.js";
import orderRoutes from "./server/routes/orderRoutes.js";
import purchaseRoutes from "./server/routes/purchaseRoutes.js";
import notificationRoutes from "./server/routes/notificationRoutes.js";
import messageRoutes from "./server/routes/messageRoutes.js";
import reviewRoutes from "./server/routes/reviewRoutes.js";
import modelRoutes from "./server/routes/modelRoutes.js";
import uploadRoutes from "./server/routes/uploadRoutes.js";
import pricingRoutes from "./server/routes/pricingRoutes.js";
import productRoutes from "./server/routes/productRoutes.js";
import blogRoutes from "./server/routes/blogRoutes.js";
import configRoutes from "./server/routes/configRoutes.js";
import { seedBlogPosts } from "./server/controllers/blogController.js";
import Review from "./server/models/Review.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : process.env.NODE_ENV === "production"
    ? 3000
    : 3001;

  // Middleware
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(express.json());

  // Connect to MongoDB
  if (process.env.MONGODB_URI) {
    const MONGO_URI = process.env.MONGODB_URI;
    const MAX_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 5000;

    // The controllers fall back to mock data whenever `readyState !== 1`, so an
    // unattended blip would silently serve fake records. Boot and reconnect both
    // exhaust every retry before that fallback is allowed to take over.
    let bootComplete = false;
    let reconnecting = false;

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const connectWithRetry = async (): Promise<boolean> => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          console.log(`[db] Connecting to MongoDB (attempt ${attempt}/${MAX_ATTEMPTS})...`);
          await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
          console.log(`[db] Connected to MongoDB on attempt ${attempt}.`);
          return true;
        } catch (err: any) {
          console.error(`[db] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err?.message || err}`);
          // Drop the half-open connection so the next attempt starts clean.
          try { await mongoose.disconnect(); } catch (_) {}
          if (attempt < MAX_ATTEMPTS) {
            console.log(`[db] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await delay(RETRY_DELAY_MS);
          }
        }
      }
      console.error(
        `[db] All ${MAX_ATTEMPTS} attempts exhausted — falling back to mock mode until a connection is restored.`
      );
      return false;
    };

    mongoose.connection.on('error', (err: any) => {
      console.error(`[db] Connection error: ${err?.message || err}`);
    });

    // Mongoose emits this for our own retry-loop disconnects too, so ignore
    // anything raised before boot settles or while a reconnect is already running.
    mongoose.connection.on('disconnected', () => {
      if (!bootComplete || reconnecting) return;
      console.warn('[db] Lost the MongoDB connection — attempting to reconnect.');
      reconnecting = true;
      connectWithRetry().finally(() => { reconnecting = false; });
    });

    (async () => {
      const connected = await connectWithRetry();

      if (connected) {
        await seedBlogPosts();
        // Stale review indexes Mongoose won't drop on its own. `inquiry_1`
        // predates inquiry becoming optional. `user_1` enforced one review
        // per user site-wide — with product reviews that has to go, or a
        // user's second review of any kind fails as a duplicate key.
        for (const staleIndex of ['inquiry_1', 'user_1']) {
          try {
            await Review.collection.dropIndex(staleIndex);
          } catch (err: any) {
            if (err.codeName !== 'IndexNotFound') {
            }
          }
        }
        try {
          await Review.syncIndexes();
        } catch (err: any) {
        }
      }

      // Only now does a 'disconnected' event mean a genuine connection loss.
      bootComplete = true;
    })();
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
  });
  app.use("/api/users", userRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/purchases", purchaseRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/models", modelRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/blog", blogRoutes);
  app.use("/api/config", configRoutes);

  // Static uploads folder
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Production: serve built frontend
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          // The shell filename is NOT content-hashed. Caching it would leave returning
          // visitors on a stale page pointing at hashed asset names that no longer exist
          // after a deploy, so it has to revalidate every time.
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          // Vite writes a content hash into these filenames, so a changed file is a
          // changed URL — safe to cache hard and never revalidate.
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.glb')) {
          // Models are large and rarely change, but the filename carries no hash — long
          // max-age WITHOUT `immutable`, so a redeployed model can still be picked up on
          // reload rather than being pinned for the full week.
          res.setHeader('Cache-Control', 'public, max-age=604800');
        }
      },
    }));
    app.get('*', (req, res) => {
      // The SPA fallback bypasses express.static, so it needs the same no-cache rule.
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

startServer();
