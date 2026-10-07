import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

export default function AdminLayout({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <main className="admin-section-page">
      <header>
        <div className="admin-header-brand">
          <Link className="admin-logo" to="/admin">
            FORMA<span>®</span>
          </Link>
          <span className="admin-status-pill">Studio Ops</span>
        </div>
        <nav>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/products">Products</Link>
          <Link to="/admin/orders">Orders</Link>
          <Link to="/admin/customers">Customers</Link>
          <Link to="/admin/settings">Settings</Link>
          <Link to="/" className="admin-nav-storefront">Storefront ↗</Link>
        </nav>
        <div className="admin-header-user">
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.name || "Admin"}</span>
            <span className="admin-user-role">Super Admin</span>
          </div>
          <button onClick={handleLogout} className="admin-logout-btn">
            Log out
          </button>
        </div>
      </header>
      <section className="admin-section-heading">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </section>
      {children}
    </main>
  );
}
