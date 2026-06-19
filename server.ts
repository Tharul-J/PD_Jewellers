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

// Helper for initial seeding
import User from './server/models/User.js';

dotenv.config();

async function seedData() {
  const usersCount = await User.countDocuments();
  if (usersCount === 0) {
    await User.insertMany([
      {
        name: 'Admin User',
        email: 'admin@pdjewellers.com',
        password: 'password123',
        role: 'administrator'
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'customer'
      }
    ]);
    console.log('Dummy users seeded to memory database.');
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // connect to MongoDB if URI is provided
  if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI).then(async () => {
      console.log("Connected to MongoDB via Mongoose");
      await seedData();
    }).catch(err => {
      console.error("MongoDB connection error:", err);
    });
  } else {
    console.warn("MONGODB_URI environment variable is not set. Database features will not work.");
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", db: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
  });
  
  // Register routers
  app.use("/api/users", userRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/models", modelRoutes);
  app.use("/api/upload", uploadRoutes);

  // Make uploads folder static
  const uploadsDir = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const viteModule = await import("vite");
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
