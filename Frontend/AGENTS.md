# FORMA Clothing Brand

React + Vite project for the FORMA luxury clothing brand.

## Development Server

```bash
cd Frontend
npm run dev     # Starts Vite dev server on port 8443
```

Backend API:
```bash
cd backend
npm run dev     # Starts Express API on port 5000
```

## Project Structure

### Frontend (`Frontend/`)
- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts the app
- `src/app/App.tsx` - Primary application component with AuthProvider + Router
- `src/app/routes.tsx` - All route definitions
- `src/index.css` - Global CSS entrypoint (vanilla CSS, no framework)
- `src/admin.css` - Admin dashboard styles
- `src/auth.css` - Authentication page styles
- `src/store-pages.css` - Store page layout styles
- `src/search-results.css` - Search results styles
- `src/api/client.ts` - API client for backend communication
- `src/auth/` - AuthContext and ProtectedRoute
- `src/components/` - Shared components (StorePageHeader, UserMenu, GlobalCartDrawer, etc.)
- `src/data/` - Data layer (catalog, cart, orders, addresses)
- `src/pages/` - All page components
- `src/admin/` - Admin sub-pages (Customers, Orders, Settings)

### Backend (`backend/`)
- `src/server.js` - Express server entry point
- `src/controllers/` - Route handlers (auth, product, category, order)
- `src/routes/` - Express route definitions
- `src/database/db.js` - SQLite database setup
- `src/database/seed.js` - Database seeding script
- `src/middleware/authMiddleware.js` - JWT auth middleware
- `src/services/otpService.js` - OTP generation & telecom SMS delivery
- `src/services/firebaseAdmin.js` - Firebase Admin SDK integration

## Dependencies

- **Frontend**: React 19, React Router 7, Vite 8, TypeScript, Firebase (SMS & Email Auth)
- **Backend**: Express, better-sqlite3, firebase-admin, Supabase JS (cloud DB option)
- **Styling**: Vanilla CSS with Google Fonts (Manrope, Syne, DM Mono)

## Code quality

- Use double quotes for strings containing apostrophes
- Ensure JSX tags are closed and braces are balanced
- Export components as default exports
