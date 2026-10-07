# FORMA — Luxury Clothing Brand E-Commerce Platform

A high-end luxury fashion e-commerce web application featuring a modern React 19 + Vite frontend, an Express REST API backend, SQLite/Supabase database integration, Firebase authentication, and Razorpay Test Mode checkout payments.

---

## 🏛️ Project Architecture

```
├── Frontend/                 # React 19 + TypeScript + Vite Client
│   ├── public/              # Static assets & SPA redirect configuration
│   ├── src/                 # Components, pages, hooks, services, state
│   ├── .env.example         # Template for frontend environment variables
│   ├── vercel.json          # SPA routing rewrite rule for Vercel
│   └── vite.config.ts       # Optimized Vite build configuration
│
├── backend/                  # Node.js + Express REST API Server
│   ├── src/
│   │   ├── controllers/     # Products, categories, orders, auth, payments
│   │   ├── database/        # SQLite + Supabase schema, connection & seeds
│   │   ├── middleware/      # Authentication & validation
│   │   ├── routes/          # Express route definitions
│   │   └── services/        # Razorpay, Firebase Admin, Brevo Email/OTP
│   ├── .env.example         # Template for backend environment variables
│   └── server.js            # Express application entrypoint
│
└── package.json              # Monorepo management scripts
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
# Install both Frontend & backend packages:
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` in both folders and fill in your values:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp Frontend/.env.example Frontend/.env
```

### 3. Run Development Servers

**In Terminal 1 (Backend):**
```bash
cd backend
npm run dev
# Starts on http://localhost:5000
```

**In Terminal 2 (Frontend):**
```bash
cd Frontend
npm run dev
# Starts on http://localhost:8443
```

---

## 💳 Razorpay Test Mode Payment Flow

- **Backend Order Creation**: `POST /api/payment/create-order` calculates order total from database products, validates amounts, converts INR to paise, and creates Razorpay orders.
- **Frontend Checkout**: Launches official Razorpay modal using `VITE_RAZORPAY_KEY_ID`.
- **Cryptographic Verification**: `POST /api/payment/verify` checks the HMAC SHA256 signature using the backend `RAZORPAY_KEY_SECRET`. Orders are only marked `payment_status = "paid"` after verification succeeds.

---

## ☁️ Deployment Guide

### Deploying the Frontend (e.g., Vercel / Netlify / Cloudflare Pages)
- **Root Directory**: `Frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: Your deployed backend URL (e.g. `https://forma-api.onrender.com/api`)
  - `VITE_RAZORPAY_KEY_ID`: `rzp_test_...`
  - `VITE_FIREBASE_*`: Your Firebase web app config

### Deploying the Backend (e.g., Render / Railway / Fly.io / Heroku)
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: `5000` (or provided by host)
  - `NODE_ENV`: `production`
  - `RAZORPAY_KEY_ID`: `rzp_test_...`
  - `RAZORPAY_KEY_SECRET`: Your Razorpay Secret Key
  - `SUPABASE_URL` & `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
  - `FIREBASE_*` credentials

---

## 🔒 Security Practices
- All `.env` files are ignored by Git. Never commit API keys or secret credentials.
- The Razorpay Secret Key is strictly retained on the backend.
- Prices are authoritatively calculated on the server to prevent client-side manipulation.
