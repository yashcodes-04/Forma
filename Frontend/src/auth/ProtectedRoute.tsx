import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth, type UserRole } from "./AuthContext";

export default function ProtectedRoute({
  children,
  role = "customer",
}: {
  children: ReactNode;
  role?: UserRole;
}) {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();

  if (role === "admin") {
    if (!isAdmin) {
      return (
        <Navigate
          to={`/admin-login?next=${encodeURIComponent(location.pathname)}`}
          replace
        />
      );
    }
    return <>{children}</>;
  }

  // Customer or general protected route
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <>{children}</>;
}
