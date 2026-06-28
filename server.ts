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
import modelRoutes from "./server/routes/modelRoutes.js";
import uploadRoutes from "./server/routes/uploadRoutes.js";
import pricingRoutes from "./server/routes/pricingRoutes.js";
import productRoutes from "./server/routes/productRoutes.js";
import blogRoutes from "./server/routes/blogRoutes.js";
import { seedBlogPosts } from "./server/controllers/blogController.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === "production" ? 3000 : 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Connect to MongoDB
  if (process.env.MONGODB_URI) {
    mongoose.connection.on('error', (err) => {
      console.log("Mongoose connection error:", err.message || "Offline");
    });

    const MONGO_URI = process.env.MONGODB_URI;
    (async () => {
      const MAX_ATTEMPTS = 3;
      const RETRY_DELAY_MS = 3000;
      let connected = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          console.log(`MongoDB connection attempt ${attempt}/${MAX_ATTEMPTS}...`);
          await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
          console.log("Connected to MongoDB established successfully.");
          await seedBlogPosts();
          connected = true;
          break;
        } catch (err: any) {
          console.log(`MongoDB attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message || err}`);
          if (attempt < MAX_ATTEMPTS) {
            console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
            try { await mongoose.disconnect(); } catch (_) {}
          }
        }
      }

      if (!connected) {
        console.log("MongoDB connection was bypassed (unreachable host). Running in mock/offline mode.");
        try { await mongoose.disconnect(); } catch (_) {}
      }
    })();
  } else {
    console.log("MONGODB_URI not set. Running in mock/offline mode.");
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
  });
  app.use("/api/users", userRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/models", modelRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/blog", blogRoutes);

  // Static uploads folder
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Production: serve built frontend
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

startServer();
