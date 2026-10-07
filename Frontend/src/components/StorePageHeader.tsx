import { useEffect, useState } from "react";
import { Link } from "react-router";
import UserMenu from "./UserMenu";
import { getTotalCartQuantity } from "../data/cart";

const CartIcon = () => (
  <svg
    className="cart-icon"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    width="16"
    height="16"
  >
    <path
      d="M5.5 8.5h13l1 12h-15l1-12ZM9 9V6a3 3 0 0 1 6 0v3"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function StorePageHeader({ title }: { title: string }) {
  const [cartCount, setCartCount] = useState(getTotalCartQuantity);

  useEffect(() => {
    const handleCartChange = () => setCartCount(getTotalCartQuantity());
    window.addEventListener("forma-cart-updated", handleCartChange);
    return () => window.removeEventListener("forma-cart-updated", handleCartChange);
  }, []);

  const openCart = () => {
    window.dispatchEvent(new Event("forma-open-cart"));
  };

  return (
    <header className="store-page-header">
      <Link className="wordmark" to="/">
        FORMA<span>®</span>
      </Link>
      <nav aria-label={`${title} navigation`}>
        <Link to="/products">Shop</Link>
        <Link to="/orders">Orders</Link>
      </nav>
      <div className="store-header-actions">
        <UserMenu />
        <button
          type="button"
          className="bag-action"
          onClick={openCart}
          aria-label={`Shopping bag with ${cartCount} items`}
        >
          <CartIcon />
          <span className="bag-text">Bag</span>
          <span className="bag-count-badge">{cartCount}</span>
        </button>
      </div>
    </header>
  );
}
