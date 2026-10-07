import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/forma.db");
const JSON_DB_PATH = path.join(__dirname, "../../data/forma_db.json");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let nativeDb = null;

// Try loading better-sqlite3
try {
  const Database = (await import("better-sqlite3")).default;
  nativeDb = new Database(DB_PATH);
  nativeDb.pragma("journal_mode = WAL");
  nativeDb.pragma("foreign_keys = ON");
} catch {
  nativeDb = null;
}

// Fallback Lightweight Engine in pure JS
class MemoryFileDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.tables = {
      categories: [],
      products: [],
      product_variants: [],
      users: [],
      orders: [],
      order_items: [],
    };
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        this.tables = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.tables, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save JSON database:", err);
    }
  }

  pragma() {}

  exec() {
    // schema placeholder
  }

  transaction(fn) {
    return (...args) => {
      const result = fn(...args);
      this.save();
      return result;
    };
  }

  prepare(sql) {
    const trimmed = sql.trim();
    const self = this;

    return {
      all(params = {}) {
        self.load();
        if (trimmed.includes("FROM categories")) {
          return self.tables.categories.map((c) => ({
            ...c,
            product_count: self.tables.products.filter(
              (p) => p.category?.toLowerCase() === c.name?.toLowerCase() && p.is_active !== 0
            ).length,
          }));
        }

        if (trimmed.includes("FROM products")) {
          let list = [...self.tables.products];

          if (params.category) {
            list = list.filter(
              (p) => p.category?.toLowerCase() === params.category?.toLowerCase()
            );
          }
          if (params.search) {
            const term = params.search.replace(/%/g, "").toLowerCase();
            list = list.filter(
              (p) =>
                p.name?.toLowerCase().includes(term) ||
                p.category?.toLowerCase().includes(term) ||
                p.tone?.toLowerCase().includes(term) ||
                p.description?.toLowerCase().includes(term)
            );
          }
          if (params.tone) {
            const term = params.tone.replace(/%/g, "").toLowerCase();
            list = list.filter((p) => p.tone?.toLowerCase().includes(term));
          }
          if (params.badge) {
            list = list.filter((p) => p.badge === params.badge);
          }
          if (params.minPrice !== undefined) {
            list = list.filter((p) => p.price >= params.minPrice);
          }
          if (params.maxPrice !== undefined) {
            list = list.filter((p) => p.price <= params.maxPrice);
          }
          if (trimmed.includes("stock > 0")) {
            list = list.filter((p) => p.stock > 0);
          }
          if (trimmed.includes("badge IS NOT NULL")) {
            list = list.filter((p) => Boolean(p.badge));
          }

          list = list.filter((p) => p.is_active !== 0);

          // Sorting
          if (trimmed.includes("ORDER BY price ASC")) {
            list.sort((a, b) => a.price - b.price);
          } else if (trimmed.includes("ORDER BY price DESC")) {
            list.sort((a, b) => b.price - a.price);
          } else if (trimmed.includes("ORDER BY name ASC")) {
            list.sort((a, b) => a.name.localeCompare(b.name));
          } else {
            list.sort((a, b) => (b.id || 0) - (a.id || 0));
          }

          if (params.limit !== undefined) {
            const offset = params.offset || 0;
            return list.slice(offset, offset + params.limit);
          }

          return list;
        }

        if (trimmed.includes("FROM users")) {
          return [...self.tables.users];
        }

        return [];
      },

      get(params = {}) {
        self.load();
        if (trimmed.includes("COUNT(*)")) {
          if (trimmed.includes("categories")) {
            return { total: self.tables.categories.length };
          }
          if (trimmed.includes("users")) {
            return { total: self.tables.users.length };
          }
          const allProds = this.all(params);
          return { total: allProds.length };
        }

        if (trimmed.includes("FROM users")) {
          const term = typeof params === "object" ? Object.values(params)[0] : params;
          if (trimmed.includes("WHERE id = ?") || trimmed.includes("WHERE id = @id")) {
            return self.tables.users.find((u) => u.id === String(term)) || null;
          }
          if (trimmed.includes("WHERE mobile = ?") || trimmed.includes("WHERE mobile = @mobile")) {
            const clean = String(term).replace(/\D/g, "");
            return (
              self.tables.users.find(
                (u) => u.mobile === term || u.mobile?.replace(/\D/g, "") === clean
              ) || null
            );
          }
          if (trimmed.includes("WHERE email = ?") || trimmed.includes("WHERE email = @email")) {
            return (
              self.tables.users.find(
                (u) => u.email?.toLowerCase() === String(term).toLowerCase()
              ) || null
            );
          }
          const cleanTerm = String(term).replace(/\D/g, "");
          return (
            self.tables.users.find(
              (u) =>
                u.id === String(term) ||
                u.mobile === String(term) ||
                (cleanTerm && u.mobile?.replace(/\D/g, "") === cleanTerm) ||
                u.email?.toLowerCase() === String(term).toLowerCase()
            ) || null
          );
        }

        if (trimmed.includes("FROM products WHERE id = ?")) {
          const id = typeof params === "object" ? Object.values(params)[0] : params;
          return self.tables.products.find((p) => p.id === Number(id)) || null;
        }

        if (trimmed.includes("FROM products WHERE slug = ?")) {
          const slug = typeof params === "object" ? Object.values(params)[0] : params;
          return self.tables.products.find((p) => p.slug === String(slug)) || null;
        }

        if (trimmed.includes("FROM categories WHERE id = ?")) {
          const id = typeof params === "object" ? Object.values(params)[0] : params;
          return self.tables.categories.find((c) => c.id === Number(id)) || null;
        }

        return null;
      },

      run(...args) {
        self.load();
        const paramObj = typeof args[0] === "object" ? args[0] : {};

        if (trimmed.includes("INSERT OR IGNORE INTO categories") || trimmed.includes("INSERT INTO categories")) {
          const name = paramObj.name || args[0];
          const slug = paramObj.slug || args[1] || name?.toLowerCase().replace(/\s+/g, "-");
          const description = paramObj.description || args[2] || "";

          const existing = self.tables.categories.find((c) => c.slug === slug || c.name === name);
          if (existing) return { lastInsertRowid: existing.id, changes: 0 };

          const newId = self.tables.categories.length ? Math.max(...self.tables.categories.map((c) => c.id || 0)) + 1 : 1;
          const newCat = { id: newId, name, slug, description, created_at: new Date().toISOString() };
          self.tables.categories.push(newCat);
          self.save();
          return { lastInsertRowid: newId, changes: 1 };
        }

        if (trimmed.includes("INSERT INTO users") || trimmed.includes("INSERT OR REPLACE INTO users") || trimmed.includes("INSERT OR IGNORE INTO users")) {
          const newUser = {
            id: paramObj.id || `usr_${Date.now()}`,
            name: paramObj.name || "",
            email: paramObj.email || null,
            mobile: paramObj.mobile,
            password_hash: paramObj.password_hash || null,
            role: paramObj.role || "customer",
            avatar: paramObj.avatar || null,
            created_at: new Date().toISOString(),
          };

          const existingIdx = self.tables.users.findIndex(
            (u) =>
              u.id === newUser.id ||
              (newUser.mobile && u.mobile === newUser.mobile) ||
              (newUser.email && u.email && u.email.toLowerCase() === newUser.email.toLowerCase())
          );

          if (existingIdx >= 0) {
            if (trimmed.includes("INSERT OR IGNORE")) {
              return { changes: 0, lastInsertRowid: self.tables.users[existingIdx].id };
            }
            self.tables.users[existingIdx] = { ...self.tables.users[existingIdx], ...newUser };
          } else {
            self.tables.users.push(newUser);
          }
          self.save();
          return { lastInsertRowid: newUser.id, changes: 1 };
        }

        if (trimmed.includes("INSERT INTO products") || trimmed.includes("INSERT OR REPLACE INTO products")) {
          const newId = paramObj.id || (self.tables.products.length ? Math.max(...self.tables.products.map((p) => p.id || 0)) + 1 : 1);
          const newProd = {
            id: newId,
            name: paramObj.name,
            slug: paramObj.slug,
            category: paramObj.category,
            description: paramObj.description || "",
            price: Number(paramObj.price),
            compare_at_price: paramObj.compare_at_price ? Number(paramObj.compare_at_price) : null,
            image: paramObj.image,
            badge: paramObj.badge || null,
            tone: paramObj.tone,
            sizes: paramObj.sizes,
            stock: Number(paramObj.stock || 0),
            is_active: paramObj.is_active !== undefined ? Number(paramObj.is_active) : 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const idx = self.tables.products.findIndex((p) => p.slug === newProd.slug || p.id === newProd.id);
          if (idx >= 0) {
            self.tables.products[idx] = { ...self.tables.products[idx], ...newProd };
          } else {
            self.tables.products.push(newProd);
          }
          self.save();
          return { lastInsertRowid: newId, changes: 1 };
        }

        if (trimmed.includes("UPDATE products SET")) {
          if (trimmed.includes("stock = ?")) {
            const stock = Number(args[0]);
            const id = Number(args[1]);
            const item = self.tables.products.find((p) => p.id === id);
            if (item) {
              item.stock = stock;
              item.updated_at = new Date().toISOString();
              self.save();
              return { changes: 1 };
            }
            return { changes: 0 };
          }

          const id = Number(paramObj.id);
          const idx = self.tables.products.findIndex((p) => p.id === id);
          if (idx >= 0) {
            self.tables.products[idx] = {
              ...self.tables.products[idx],
              ...paramObj,
              id,
              updated_at: new Date().toISOString(),
            };
            self.save();
            return { changes: 1 };
          }
          return { changes: 0 };
        }

        if (trimmed.includes("DELETE FROM products WHERE id = ?")) {
          const id = Number(typeof args[0] === "object" ? Object.values(args[0])[0] : args[0]);
          const initialLen = self.tables.products.length;
          self.tables.products = self.tables.products.filter((p) => p.id !== id);
          self.save();
          return { changes: initialLen - self.tables.products.length };
        }

        return { changes: 0 };
      },
    };
  }
}

export const db = nativeDb || new MemoryFileDatabase(JSON_DB_PATH);

export function initDB() {
  const schemaPath = path.join(__dirname, "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schemaSql);
  }

  // Safely ensure Razorpay columns exist in orders table
  try {
    const cols = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
    if (!cols.includes("razorpay_order_id")) {
      db.exec("ALTER TABLE orders ADD COLUMN razorpay_order_id VARCHAR(100)");
    }
    if (!cols.includes("razorpay_payment_id")) {
      db.exec("ALTER TABLE orders ADD COLUMN razorpay_payment_id VARCHAR(100)");
    }
    if (!cols.includes("razorpay_signature")) {
      db.exec("ALTER TABLE orders ADD COLUMN razorpay_signature TEXT");
    }
    if (!cols.includes("currency")) {
      db.exec("ALTER TABLE orders ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'");
    }
  } catch (err) {
    // Non-sqlite or already up to date
  }
}

export default db;
