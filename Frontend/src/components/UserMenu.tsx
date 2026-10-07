import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

const UserIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="14" height="14">
    <path
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="12" height="12">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function UserMenu() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="user-auth-actions">
        <Link className="text-action account-action" to="/login">
          Sign In
        </Link>
        <Link className="register-action" to="/register">
          Join
        </Link>
      </div>
    );
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "FM";

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate("/");
  };

  return (
    <div className="user-menu-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="user-avatar-pill">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="avatar-img" />
          ) : (
            <span className="avatar-initials">{initials}</span>
          )}
          <span className="user-firstname">{user.firstName || user.name.split(" ")[0]}</span>
          {isAdmin && (
            <span className="role-tag role-tag-admin" title="Studio Admin">
              Admin
            </span>
          )}
        </div>
        <ChevronDownIcon />
      </button>

      {isOpen && (
        <div className="user-dropdown-menu" role="menu">
          <div className="user-dropdown-header">
            <div className="user-dropdown-name">{user.name}</div>
            <div className="user-dropdown-contact">{user.email || user.mobile}</div>
            <div className="user-dropdown-role">
              <span className={`role-badge ${isAdmin ? "role-admin" : "role-customer"}`}>
                {isAdmin ? <ShieldCheckIcon /> : <UserIcon />}
                {isAdmin ? "Studio Administrator" : "Forma Member"}
              </span>
            </div>
          </div>

          <div className="user-dropdown-divider" />

          <div className="user-dropdown-links">
            <Link
              to="/orders"
              className="user-dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              My Orders
            </Link>
            <Link
              to="/cart"
              className="user-dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              Shopping Bag
            </Link>

            {isAdmin ? (
              <Link
                to="/admin"
                className="user-dropdown-item highlight-admin"
                onClick={() => setIsOpen(false)}
              >
                Studio Operations →
              </Link>
            ) : null}
          </div>

          <div className="user-dropdown-divider" />

          <button
            type="button"
            className="user-dropdown-logout"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
