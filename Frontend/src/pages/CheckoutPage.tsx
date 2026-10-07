import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import EmptyState from "../components/EmptyState";
import StorePageHeader from "../components/StorePageHeader";
import { paymentApi } from "../api/client";
import {
  loadUserAddresses,
  saveUserAddresses,
  type SavedAddress,
} from "../data/addresses";
import { loadCart, saveCart } from "../data/cart";
import { formatINR } from "../data/catalog";
import { saveOrder, type Order } from "../data/orders";
import { openRazorpayCheckout } from "../services/razorpay";
import "../store-pages.css";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const items = loadCart();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [addresses, setAddresses] = useState<SavedAddress[]>(() => loadUserAddresses(user));
  const [selectedAddress, setSelectedAddress] = useState("");
  const [saveForLater, setSaveForLater] = useState(false);
  const [delivery, setDelivery] = useState({
    name: user?.name || "",
    mobile: user?.mobile?.replace("+91", "") || "",
    address: "",
    city: "",
    pin: "",
  });

  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderDraftId, setOrderDraftId] = useState<string>("");

  // Re-sync addresses when active user changes
  useEffect(() => {
    const userAddrs = loadUserAddresses(user);
    setAddresses(userAddrs);
    if (user?.name && !delivery.name) {
      setDelivery((prev) => ({
        ...prev,
        name: user.name,
        mobile: user.mobile?.replace("+91", "") || prev.mobile,
      }));
    }
  }, [user]);

  const updateDelivery = (field: keyof typeof delivery, value: string) => {
    setDelivery((current) => ({ ...current, [field]: value }));
    setSelectedAddress("");
    setErrorMessage(null);
  };

  const chooseAddress = (savedAddress: SavedAddress) => {
    setSelectedAddress(savedAddress.id);
    setDelivery({
      name: savedAddress.name,
      mobile: savedAddress.mobile,
      address: savedAddress.address,
      city: savedAddress.city,
      pin: savedAddress.pin,
    });
    setErrorMessage(null);
  };

  const removeAddress = (id: string) => {
    const nextAddresses = addresses.filter((address) => address.id !== id);
    setAddresses(nextAddresses);
    saveUserAddresses(nextAddresses, user);
    if (selectedAddress === id) setSelectedAddress("");
  };

  /**
   * Handle Razorpay Test Mode Payment and Order Creation
   */
  const handlePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    // Validate inputs
    if (!delivery.name.trim() || !delivery.mobile.trim() || !delivery.address.trim() || !delivery.city.trim() || !delivery.pin.trim()) {
      setErrorMessage("Please complete all shipping address fields before proceeding to payment.");
      return;
    }

    if (items.length === 0) {
      setErrorMessage("Your shopping bag is empty.");
      return;
    }

    // Save address if requested
    if (saveForLater) {
      const alreadySaved = addresses.some(
        (address) =>
          address.address === delivery.address &&
          address.pin === delivery.pin &&
          address.mobile === delivery.mobile,
      );
      if (!alreadySaved) {
        const nextAddresses = [
          ...addresses,
          {
            id: `address-${Date.now()}`,
            userId: user?.id,
            userMobile: user?.mobile,
            ...delivery,
          },
        ];
        setAddresses(nextAddresses);
        saveUserAddresses(nextAddresses, user);
      }
    }

    setIsProcessing(true);
    setProcessingStatus("Initializing secure Razorpay payment order...");

    const cleanUserMobile =
      user?.mobile || (delivery.mobile.startsWith("+91") ? delivery.mobile : `+91${delivery.mobile}`);

    // Generate or reuse order ID to prevent duplicates on retry
    const currentOrderId = orderDraftId || `FRM-${Date.now().toString().slice(-7)}`;
    if (!orderDraftId) {
      setOrderDraftId(currentOrderId);
    }

    try {
      // 1. Call Backend to create Razorpay Order (with authoritative price verification)
      const createRes = await paymentApi.createOrder({
        amount: total,
        currency: "INR",
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
          category: i.category,
          size: i.selectedSize || i.sizes || "Standard",
          tone: i.tone,
        })),
        orderId: currentOrderId,
        customer: {
          name: delivery.name,
          mobile: cleanUserMobile,
          email: user?.email || "",
        },
        shippingAddress: delivery,
        userId: user?.id,
      });

      if (!createRes.success || !createRes.order) {
        setIsProcessing(false);
        setErrorMessage(
          createRes.message || "Failed to initialize payment order. Please verify backend Razorpay configuration."
        );
        return;
      }

      setProcessingStatus("Opening Razorpay checkout gateway...");

      // 2. Open Razorpay Checkout Modal (Test Mode)
      await openRazorpayCheckout({
        razorpayOrder: createRes.order,
        keyId: createRes.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "",
        customer: {
          name: delivery.name,
          email: user?.email || "",
          mobile: delivery.mobile,
        },
        onSuccess: async (rzpSuccess) => {
          setProcessingStatus("Verifying payment security signature with server...");

          // 3. Backend HMAC SHA256 Signature Verification
          const verifyRes = await paymentApi.verifyPayment({
            razorpay_order_id: rzpSuccess.razorpay_order_id,
            razorpay_payment_id: rzpSuccess.razorpay_payment_id,
            razorpay_signature: rzpSuccess.razorpay_signature,
            orderId: currentOrderId,
          });

          if (verifyRes.success) {
            // Save local user order & empty bag
            const confirmedOrder: Order = {
              id: currentOrderId,
              userId: user?.id,
              userMobile: cleanUserMobile,
              userEmail: user?.email,
              date: new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
              status: "Confirmed",
              total,
              items,
              customer: delivery.name,
              customerMobile: delivery.mobile,
              shippingAddress: delivery,
            };

            saveOrder(confirmedOrder);
            saveCart([]);
            setIsProcessing(false);
            navigate(`/orders?payment_success=true&orderId=${currentOrderId}`);
          } else {
            setIsProcessing(false);
            setErrorMessage(
              verifyRes.message || "Payment verification failed. If your account was charged, it will be refunded."
            );
          }
        },
        onError: (err) => {
          setIsProcessing(false);
          setErrorMessage(err.message || "Payment was rejected or failed. Please try again.");
        },
        onDismiss: () => {
          setIsProcessing(false);
          setErrorMessage("Payment checkout was closed before completion. You can retry when ready.");
        },
      });
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      setIsProcessing(false);
      setErrorMessage(err.message || "An unexpected error occurred during payment initiation.");
    }
  };

  return (
    <main className="store-page">
      <StorePageHeader title="Checkout" />
      <section className="simple-page-heading">
        <p>Checkout / Secure Razorpay Gateway</p>
        <h1>Complete your order.</h1>
      </section>

      {items.length === 0 ? (
        <EmptyState title="Nothing to check out." text="Add a piece to your bag first." />
      ) : (
        <form className="checkout-layout" onSubmit={handlePayment}>
          <div className="checkout-fields">
            {addresses.length > 0 && (
              <section className="saved-addresses">
                <div>
                  <h2>Saved addresses</h2>
                  <span>{addresses.length} saved</span>
                </div>
                <div className="saved-address-grid">
                  {addresses.map((savedAddress) => (
                    <article
                      className={selectedAddress === savedAddress.id ? "is-selected" : ""}
                      key={savedAddress.id}
                    >
                      <button
                        className="select-address"
                        type="button"
                        onClick={() => chooseAddress(savedAddress)}
                      >
                        <strong>{savedAddress.name}</strong>
                        <span>{savedAddress.address}</span>
                        <span>
                          {savedAddress.city} · {savedAddress.pin}
                        </span>
                        <span>+91 {savedAddress.mobile}</span>
                      </button>
                      <button
                        className="remove-address"
                        type="button"
                        onClick={() => removeAddress(savedAddress.id)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <h2>Delivery details</h2>
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                value={delivery.name}
                onChange={(event) => updateDelivery("name", event.target.value)}
                required
                disabled={isProcessing}
              />
            </label>
            <label>
              Mobile number
              <input
                name="mobile"
                type="tel"
                inputMode="numeric"
                value={delivery.mobile}
                onChange={(event) =>
                  updateDelivery("mobile", event.target.value.replace(/\D/g, ""))
                }
                required
                disabled={isProcessing}
              />
            </label>
            <label>
              Address
              <textarea
                name="address"
                rows={3}
                value={delivery.address}
                onChange={(event) => updateDelivery("address", event.target.value)}
                required
                disabled={isProcessing}
              />
            </label>
            <div>
              <label>
                City
                <input
                  name="city"
                  value={delivery.city}
                  onChange={(event) => updateDelivery("city", event.target.value)}
                  required
                  disabled={isProcessing}
                />
              </label>
              <label>
                PIN code
                <input
                  name="pin"
                  inputMode="numeric"
                  maxLength={6}
                  value={delivery.pin}
                  onChange={(event) =>
                    updateDelivery("pin", event.target.value.replace(/\D/g, ""))
                  }
                  required
                  disabled={isProcessing}
                />
              </label>
            </div>
            <label className="save-address-control">
              <input
                type="checkbox"
                checked={saveForLater}
                onChange={(event) => setSaveForLater(event.target.checked)}
                disabled={isProcessing}
              />
              <span>
                <strong>Save this address</strong>
                Use it for a faster checkout next time.
              </span>
            </label>
          </div>

          <aside className="checkout-summary">
            <p>{items.length} styles</p>
            {items.map((item) => (
              <div key={item.id}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong>{formatINR(item.price * item.quantity)}</strong>
              </div>
            ))}
            <div className="checkout-total">
              <span>Total</span>
              <strong>{formatINR(total)}</strong>
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  lineHeight: 1.45,
                  margin: "8px 0 14px",
                }}
                role="alert"
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {isProcessing && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  color: "#60a5fa",
                  fontSize: "0.85rem",
                  lineHeight: 1.45,
                  margin: "8px 0 14px",
                }}
              >
                ⏳ {processingStatus}
              </div>
            )}

            <button type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : `Pay ${formatINR(total)} with Razorpay →`}
            </button>
            <small>🔒 Razorpay Test Mode · UPI, Cards & NetBanking · 256-bit encryption</small>
          </aside>
        </form>
      )}
    </main>
  );
}
