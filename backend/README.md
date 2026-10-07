# FORMA Clothing Brand — Backend API & Database

Production-grade RESTful API server and relational database architecture for FORMA luxury clothing brand.

---

## 🗄️ Database Architecture

The system uses a relational schema with indexes, foreign key constraints, and WAL (Write-Ahead Logging) mode.

### Database Tables

#### 1. `categories`
Stores product categories and collection metadata.
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (VARCHAR(100) NOT NULL UNIQUE)
- `slug` (VARCHAR(100) NOT NULL UNIQUE)
- `description` (TEXT)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

#### 2. `products`
Main catalog table with indexing on `category`, `price`, and `created_at`.
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (VARCHAR(255) NOT NULL)
- `slug` (VARCHAR(255) NOT NULL UNIQUE)
- `category_id` (INTEGER REFERENCES categories(id))
- `category` (VARCHAR(100) NOT NULL)
- `description` (TEXT)
- `price` (INTEGER NOT NULL)
- `compare_at_price` (INTEGER)
- `image` (TEXT NOT NULL)
- `gallery` (TEXT JSON Array)
- `badge` (VARCHAR(50)) — e.g. *Bestseller*, *New arrival*, *Limited*
- `tone` (VARCHAR(100) NOT NULL) — e.g. *Ink*, *Stone*, *Charcoal*
- `sizes` (VARCHAR(100) NOT NULL) — e.g. *XS–XL*, *26–36*
- `stock` (INTEGER NOT NULL DEFAULT 0)
- `is_active` (INTEGER DEFAULT 1)
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

#### 3. `product_variants`
SKU-level inventory control for size and color variants.
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `product_id` (INTEGER REFERENCES products(id) ON DELETE CASCADE)
- `size` (VARCHAR(50))
- `color` (VARCHAR(50))
- `sku` (VARCHAR(100) UNIQUE)
- `stock` (INTEGER DEFAULT 0)
- `price_override` (INTEGER)

#### 4. `users`
Customer and administrator accounts with role-based access.
- `id` (VARCHAR(64) PRIMARY KEY)
- `name` (VARCHAR(255) NOT NULL)
- `email` (VARCHAR(255) UNIQUE)
- `mobile` (VARCHAR(20) UNIQUE NOT NULL)
- `password_hash` (TEXT)
- `role` (VARCHAR(20) DEFAULT 'customer') — `'customer'` | `'admin'`
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

#### 5. `orders` & `order_items`
Order records and individual line items with snapshot pricing.

---

## 🚀 Product REST API Endpoints

### 1. List Products
- **URL**: `GET /api/products`
- **Query Parameters**:
  - `q` (string): Text search across title, category, tone, and description.
  - `category` (string): Filter by category (e.g. `Outerwear`, `Tailoring`).
  - `tone` (string): Filter by color/tone (e.g. `Ink`, `Stone`).
  - `badge` (string): Filter by badge (e.g. `Bestseller`, `New arrival`).
  - `minPrice` (number): Minimum price in INR.
  - `maxPrice` (number): Maximum price in INR.
  - `inStock` (boolean): `true` to only return available stock.
  - `sort` (string): `newest` (default), `price_asc`, `price_desc`, `name_asc`, `popular`.
  - `page` (number): Page number (default: 1).
  - `limit` (number): Page size (default: 50).
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "Contour Overshirt",
        "slug": "contour-overshirt",
        "category": "Outerwear",
        "price": 7490,
        "compare_at_price": 8990,
        "image": "https://...",
        "badge": "Bestseller",
        "tone": "Ink",
        "sizes": "XS–XL",
        "stock": 18
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
  ```

### 2. Get Featured Products
- **URL**: `GET /api/products/featured`
- **Response**: Returns bestsellers and new arrival highlight drops.

### 3. Get Single Product
- **URL**: `GET /api/products/:id` (supports numeric ID or string slug)
- **Response**: Full product object including description, image gallery, and metadata.

### 4. Create Product Drop (Admin)
- **URL**: `POST /api/products`
- **Headers**: `x-role: admin` or `Authorization: Bearer <admin-token>`
- **Body**:
  ```json
  {
    "name": "Structured Canvas Bomber",
    "category": "Outerwear",
    "description": "Heavy organic canvas bomber jacket.",
    "price": 8990,
    "compare_at_price": 10990,
    "image": "https://...",
    "badge": "New drop",
    "tone": "Olive",
    "sizes": "S, M, L, XL",
    "stock": 15
  }
  ```

### 5. Update Product (Admin)
- **URL**: `PUT /api/products/:id`
- **Headers**: `x-role: admin`
- **Body**: Any partial or full product fields to update.

### 6. Quick Stock Adjustment (Admin)
- **URL**: `PATCH /api/products/:id/stock`
- **Body**: `{ "stock": 25 }` or `{ "delta": -1 }`

### 7. Delete Product (Admin)
- **URL**: `DELETE /api/products/:id`

### 8. List Categories
- **URL**: `GET /api/categories`
- **Response**: All categories with real-time `product_count`.

### 9. Health & Metrics Check
- **URL**: `GET /api/health`
- **Response**: Health status, connected database tables, and record counts.

---

## 💻 Running the Backend

```bash
cd backend
npm install
npm run seed      # (Optional) re-seed initial data
npm run dev       # Start server in watch mode on port 5000
```
