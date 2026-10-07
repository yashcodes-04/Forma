import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  loadCart,
  saveCart,
  updateCartItemQuantity,
  updateCartItemSize,
  type CartItem,
} from "../data/cart";
import { formatINR, parseSizes } from "../data/catalog";

const BagIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="48" height="48">
    <path
      d="M5.5 8.5h13l1 12h-15l1-12ZM9 9V6a3 3 0 0 1 6 0v3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="14" height="14">
    <path
      d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-6 5v6m4-6v6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ArrowIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" width="16" height="16">
    <path
      d="M5 12h14m-5-5 5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function GlobalCartDrawer() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleCartUpdate = () => {
      setItems(loadCart());
    };
    const handleOpen = () => {
      setItems(loadCart());
      setIsOpen(true);
    };
    const handleClose = () => {
      setIsOpen(false);
    };

    window.addEventListener("forma-cart-updated", handleCartUpdate);
    window.addEventListener("forma-open-cart", handleOpen);
    window.addEventListener("forma-close-cart", handleClose);

    return () => {
      window.removeEventListener("forma-cart-updated", handleCartUpdate);
      window.removeEventListener("forma-open-cart", handleOpen);
      window.removeEventListener("forma-close-cart", handleClose);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCartQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleUpdateQty = (id: number, size: string | undefined, amount: number) => {
    const res = updateCartItemQuantity(id, size, amount);
    if (res.success || amount < 0) {
      setItems(res.cart);
    }
  };

  const handleUpdateSize = (id: number, oldSize: string | undefined, newSize: string) => {
    const nextCart = updateCartItemSize(id, oldSize, newSize);
    setItems(nextCart);
  };

  const handleDelete = (id: number, size?: string) => {
    const nextCart = items.filter(
      (item) => !(item.id === id && (item.selectedSize || "") === (size || ""))
    );
    setItems(nextCart);
    saveCart(nextCart);
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  return (
    <>
      <button
        type="button"
        className={`cart-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={() => setIsOpen(false)}
        aria-label="Close shopping bag backdrop"
        tabIndex={isOpen ? 0 : -1}
      />
      <aside
        className={`cart-drawer ${isOpen ? "is-open" : ""}`}
        aria-hidden={!isOpen}
        aria-label="Shopping bag"
      >
        <div className="cart-heading">
          <div>
            <p className="eyebrow">Your selection / {totalCartQty} items (Max 50)</p>
            <h2>Shopping bag</h2>
          </div>
          <button
            type="button"
            className="close-button"
            onClick={() => setIsOpen(false)}
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
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/products");
                }}
              >
                Continue shopping
              </button>
            </div>
          ) : (
            items.map((item, idx) => {
              const availableSizes = parseSizes(item.sizes);
              const productCartQty = items
                .filter((i) => i.id === item.id)
                .reduce((sum, i) => sum + i.quantity, 0);
              const isStockMax = productCartQty >= item.stock;
              const isTotalMax = totalCartQty >= 50;

              return (
                <div className="cart-item" key={`${item.id}-${item.selectedSize || idx}`}>
                  <img src={item.image} alt={item.name} />
                  <div className="cart-item-info">
                    <div className="cart-item-head-row">
                      <div>
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
                        onClick={() => handleDelete(item.id, item.selectedSize)}
                        title="Remove from bag"
                        aria-label={`Remove ${item.name} from bag`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    <div className="cart-item-row">
                      <div className="quantity">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.selectedSize, -1)}
                          aria-label="Remove one"
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.selectedSize, 1)}
                          disabled={isStockMax || isTotalMax}
                          aria-label={
                            isStockMax
                              ? `Stock limit reached (${item.stock} units max)`
                              : isTotalMax
                              ? "Cart limit of 50 items reached"
                              : "Add one"
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
            <p>Shipping and taxes calculated at checkout.</p>
            <button type="button" className="checkout-button" onClick={handleCheckout}>
              Checkout <ArrowIcon />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
