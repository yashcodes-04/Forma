-- ==========================================================
-- FORMA CLOTHING BRAND DATABASE SCHEMA
-- Compatible with SQLite, PostgreSQL, MySQL
-- ==========================================================

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  compare_at_price INTEGER,
  image TEXT NOT NULL,
  gallery TEXT DEFAULT '[]', -- JSON array of image URLs
  badge VARCHAR(50), -- e.g. 'Bestseller', 'New arrival', 'Limited'
  tone VARCHAR(100) NOT NULL, -- e.g. 'Ink', 'Stone', 'Walnut'
  sizes VARCHAR(100) NOT NULL, -- e.g. 'XS–XL', '26–36', 'One size'
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active INTEGER NOT NULL DEFAULT 1, -- 1: Active, 0: Archived
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- 3. PRODUCT VARIANTS TABLE (Specific Size/Color Stock Units)
CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  stock INTEGER NOT NULL DEFAULT 0,
  price_override INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);

-- 4. USERS & ROLES TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  password_hash TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_mobile VARCHAR(20) NOT NULL,
  shipping_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  subtotal INTEGER NOT NULL,
  shipping_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Confirmed', -- 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled'
  payment_method VARCHAR(50) DEFAULT 'Razorpay',
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'paid' | 'failed'
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature TEXT,
  currency VARCHAR(10) DEFAULT 'INR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_image TEXT NOT NULL,
  category VARCHAR(100),
  size VARCHAR(50),
  tone VARCHAR(50),
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
