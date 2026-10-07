import { createBrowserRouter } from "react-router";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import AdminCustomersPage from "../admin/AdminCustomersPage";
import AdminOrdersPage from "../admin/AdminOrdersPage";
import AdminSettingsPage from "../admin/AdminSettingsPage";
import ProtectedRoute from "../auth/ProtectedRoute";
import CartPage from "../pages/CartPage";
import CheckoutPage from "../pages/CheckoutPage";
import OrdersPage from "../pages/OrdersPage";
import ProductDetailsPage from "../pages/ProductDetailsPage";
import ProductsPage from "../pages/ProductsPage";
import AuthPage from "../pages/AuthPage";
import HomePage from "../pages/HomePage";
import SearchResultsPage from "../pages/SearchResultsPage";
import RootLayout from "../components/RootLayout";

const LoginPage = () => <AuthPage mode="login" />;
const RegisterPage = () => <AuthPage mode="register" />;

function AdminGuard() {
  return (
    <ProtectedRoute role="admin">
      <AdminDashboardPage />
    </ProtectedRoute>
  );
}

function NotFoundPage() {
  return (
    <main className="not-found">
      <p>404 / Page not found</p>
      <h1>Lost the thread?</h1>
      <a href="/">Return to Forma</a>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", Component: HomePage },
      { path: "/login", Component: LoginPage },
      { path: "/register", Component: RegisterPage },
      { path: "/search", Component: SearchResultsPage },
      { path: "/products", Component: ProductsPage },
      { path: "/products/:id", Component: ProductDetailsPage },
      { path: "/cart", Component: CartPage },
      {
        path: "/checkout",
        element: (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/orders",
        element: (
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        ),
      },
      { path: "/admin-login", Component: AdminLoginPage },
      { path: "/admin", Component: AdminGuard },
      { path: "/admin/products", Component: AdminGuard },
      {
        path: "/admin/orders",
        element: (
          <ProtectedRoute role="admin">
            <AdminOrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/customers",
        element: (
          <ProtectedRoute role="admin">
            <AdminCustomersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/settings",
        element: (
          <ProtectedRoute role="admin">
            <AdminSettingsPage />
          </ProtectedRoute>
        ),
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);
