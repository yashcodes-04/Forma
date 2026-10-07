import { FormEvent, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import "../admin.css";

const ADMIN_PHONE = "9999999999";

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="18" height="18">
    <path d="M5 12h14m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const LockIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="16" height="16">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.6"/>
  </svg>
);

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginAdmin, isAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as admin, route directly to admin dashboard
  useEffect(() => {
    if (isAdmin) {
      const nextPath = searchParams.get("next") || "/admin";
      navigate(nextPath, { replace: true });
    }
  }, [isAdmin, navigate, searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const nextPath = searchParams.get("next") || "/admin";

    try {
      const res = await loginAdmin({ email, password });
      if (res.success) {
        navigate(nextPath, { replace: true });
      } else {
        setError(res.error || "Invalid administrator credentials. Access denied.");
      }
    } catch {
      setError("Authorization server connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-login">
      <section>
        <Link className="admin-logo" to="/">
          FORMA<span>®</span>
        </Link>
        <div className="admin-login-copy">
          <p>Restricted / Studio Operations</p>
          <h1>Studio Admin.</h1>
          <span>
            Real-time catalog orchestration, inventory allocations, live orders, and
            storefront configuration.
          </span>
          <div className="admin-auth-credentials-card">
            <h4>Security Notice</h4>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.82rem", color: "var(--color-admin-subtle, #94a3b8)", lineHeight: "1.5" }}>
              Restricted system. Access is monitored and granted only to authorized Forma studio personnel.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-login-panel">
        <form onSubmit={handleSubmit}>
          <div className="admin-login-header">
            <div className="admin-role-badge">
              <LockIcon />
              <span>Studio Operator Access</span>
            </div>
            <h2>Sign In to Studio Admin</h2>
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "#888" }}>
              Enter your verified studio credentials to continue.
            </p>
          </div>

          <label>
            Studio Admin Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@trial.com"
              autoComplete="username"
              required
              autoFocus
            />
          </label>

          <label>
            Admin Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="admin-error">{error}</div>}

          <button className="admin-primary" type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? "Authenticating..." : "Authenticate & Open Studio"}</span>
            <ArrowIcon />
          </button>

          <div className="admin-back-row">
            <Link to="/" className="admin-link-secondary">
              ← Return to Storefront
            </Link>
            <Link to="/login" className="admin-link-secondary">
              Customer Sign In →
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
