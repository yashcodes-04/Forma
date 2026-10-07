import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDB, db } from "./database/db.js";
import { seed } from "./database/seed.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import { supabase, isSupabaseConfigured } from "./database/supabaseClient.js";

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Database & Seed if empty
initDB();
try {
  const count = db.prepare("SELECT COUNT(*) as total FROM products").get();
  if (count.total === 0) {
    console.log("Database is empty. Running initial seed...");
    seed();
  }
} catch (err) {
  console.log("Seeding on startup...", err.message);
  seed();
}

// Sync permanent customer profiles from Supabase Cloud into local cache
if (isSupabaseConfigured && supabase) {
  supabase
    .from("profiles")
    .select("*")
    .then(({ data, error }) => {
      if (!error && data && data.length > 0) {
        const insertUser = db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, mobile, role, avatar, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const u of data) {
          insertUser.run(
            u.id,
            u.name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Forma Member",
            u.email || null,
            u.mobile,
            u.role || "customer",
            u.avatar || null,
            u.created_at || new Date().toISOString()
          );
        }
        console.log(`☁️ Synced ${data.length} profiles from Supabase Cloud.`);
      }
    })
    .catch((syncErr) => console.warn("Supabase startup sync notice:", syncErr.message));
}

// Root Route & Health Check
app.get("/", (req, res) => {
  res.json({
    name: "FORMA Clothing Studio API",
    version: "1.0.0",
    status: "online",
    documentation: "/api/health",
  });
});

app.get("/api/health", (req, res) => {
  const productCount = db.prepare("SELECT COUNT(*) as total FROM products").get()?.total || 0;
  const categoryCount = db.prepare("SELECT COUNT(*) as total FROM categories").get()?.total || 0;
  const orderCount = db.prepare("SELECT COUNT(*) as total FROM orders").get()?.total || 0;

  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      tables: ["products", "categories", "product_variants", "users", "orders", "order_items"],
      metrics: {
        products: productCount,
        categories: categoryCount,
        orders: orderCount,
      },
    },
  });
});

// Mount Routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// Start Server with Port Fallback
function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 FORMA API running on http://localhost:${portToUse}`);
    console.log(`📦 Product Endpoints: http://localhost:${portToUse}/api/products`);
    console.log(`🏷️  Category Endpoints: http://localhost:${portToUse}/api/categories`);
    console.log(`❤️  Health Check:     http://localhost:${portToUse}/api/health`);
    console.log(`==============================================\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️ Port ${portToUse} is in use. Trying port ${Number(portToUse) + 1}...`);
      startServer(Number(portToUse) + 1);
    } else {
      console.error("Server startup error:", err);
    }
  });
}

startServer(PORT);

export default app;
// Reload triggered for environment variables
