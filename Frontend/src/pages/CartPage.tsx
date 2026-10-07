import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  loadCart,
  saveCart,
  updateCartItemQuantity,
  updateCartItemSize,
  type CartItem,
} from "../data/cart";
import { formatINR, parseSizes } from "../data/catalog";
import "../store-pages.css";

const BagIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path
      d="M5.5 8.5h13l1 12h-15l1-12ZM9 9V6a3 3 0 0 1 6 0v3"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="15" height="15">
    <path
      d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = (id: number, size: string | undefined, amount: number) => {
    const res = updateCartItemQuantity(id, size, amount);
    if (res.success || amount < 0) {
      setItems(res.cart);
    }
  };

  const handleUpdateSize = (id: number, oldSize: string | undefined, newSize: string) => {
    const nextItems = updateCartItemSize(id, oldSize, newSize);
    setItems(nextItems);
  };

  const removeItem = (id: number, size?: string) => {
    const nextItems = items.filter(
      (item) => !(item.id === id && (item.selectedSize || "") === (size || ""))
    );
    setItems(nextItems);
    saveCart(nextItems);
  };

  return (
    <main className="cart-route-page">
      <div className="cart-route-scene">
        <Link className="wordmark" to="/">
          FORMA<span>®</span>
        </Link>
        <div>
          <p>Collection / Your selection</p>
          <h1>Considered pieces, ready when you are.</h1>
          <Link to="/products">Continue shopping →</Link>
        </div>
      </div>

      <aside className="cart-drawer cart-route-drawer is-open" aria-label="Shopping bag">
        <div className="cart-heading">
          <div>
            <p className="eyebrow">Your selection / {itemCount} items</p>
            <h2>Shopping bag</h2>
          </div>
          <button
            className="close-button"
            onClick={() => navigate(-1)}
            aria-label="Close shopping bag"
          >
            ×
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="empty-cart">
              <BagIcon />
              <h3>Your bag is empty</h3>
              <p>Explore the new collection and find your next everyday uniform.</p>
              <Link className="cart-continue-link" to="/products">
                Continue shopping
              </Link>
            </div>
          ) : (
            items.map((item, idx) => {
              const availableSizes = parseSizes(item.sizes);
              const productCartQty = items
                .filter((i) => i.id === item.id)
                .reduce((sum, i) => sum + i.quantity, 0);
              const isStockMax = productCartQty >= item.stock;
              const isTotalMax = itemCount >= 50;

              return (
                <div className="cart-item" key={`${item.id}-${item.selectedSize || idx}`}>
                  <img src={item.image} alt="" />
                  <div className="cart-item-info">
                    <div className="cart-item-head-row">
                      <div>
                        <p>{item.category}</p>
                        <h3>{item.name}</h3>
                        <div className="cart-item-size-row">
                          <span>{item.tone}</span>
                          <span className="cart-size-divider">·</span>
                          {availableSizes.length > 1 ? (
                            <label className="cart-size-label">
                              <span>Size:</span>
                              <select
                                className="cart-size-dropdown"
                                value={item.selectedSize || availableSizes[0]}
                                onChange={(e) =>
                                  handleUpdateSize(item.id, item.selectedSize, e.target.value)
                                }
                              >
                                {availableSizes.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <span className="cart-size-static">
                              Size: <strong>{item.selectedSize || item.sizes}</strong>
                            </span>
                          )}
                          {isStockMax && (
                            <span
                              className="cart-stock-tag"
                              title="Maximum available stock for this piece is in your bag"
                            >
                              Max Stock
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cart-item-delete-btn"
                        onClick={() => removeItem(item.id, item.selectedSize)}
                        title="Remove item from bag"
                        aria-label={`Remove ${item.name} from bag`}
                      >
                        <TrashIcon />
                        <span>Remove</span>
                      </button>
                    </div>
                  <div className="cart-item-row">
                    <div className="quantity">
                      <button
                        onClick={() => updateQuantity(item.id, item.selectedSize, -1)}
                        aria-label={`Remove one ${item.name}`}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.selectedSize, 1)}
                        disabled={isStockMax || isTotalMax}
                        aria-label={
                          isStockMax
                            ? `Stock limit reached (${item.stock} max)`
                            : isTotalMax
                            ? "Cart limit of 50 items reached"
                            : `Add one ${item.name}`
                        }
                        title={
                          isStockMax
                            ? `Stock limit reached (${item.stock} max)`
                            : isTotalMax
                            ? "Total cart limit of 50 reached"
                            : "Add one"
                        }
                      >
                        +
                      </button>
                    </div>
                    <strong>{formatINR(item.price * item.quantity)}</strong>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-summary">
            <div>
              <span>Subtotal</span>
              <strong>{formatINR(total)}</strong>
            </div>
            <p>
              {total >= 10000
                ? "Complimentary shipping included."
                : "Shipping and taxes calculated at checkout."}
            </p>
            <Link className="checkout-button cart-route-checkout" to="/checkout">
              Checkout
              <span>→</span>
            </Link>
          </div>
        )}
      </aside>
    </main>
  );
}
