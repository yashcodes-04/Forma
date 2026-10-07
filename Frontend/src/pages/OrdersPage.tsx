import { useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import EmptyState from "../components/EmptyState";
import StorePageHeader from "../components/StorePageHeader";
import { formatINR } from "../data/catalog";
import { loadUserOrders } from "../data/orders";
import "../store-pages.css";

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const paymentSuccess = searchParams.get("payment_success") === "true";
  const orderId = searchParams.get("orderId");

  const { user } = useAuth();
  const orders = loadUserOrders(user);

  return (
    <main className="store-page">
      <StorePageHeader title="Orders" />

      {paymentSuccess && (
        <section
          style={{
            maxWidth: "1180px",
            margin: "24px auto 0",
            padding: "16px 20px",
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            borderRadius: "8px",
            color: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <strong style={{ display: "block", fontSize: "1rem", color: "#4ade80" }}>
              ✅ Payment verified successfully via Razorpay (Test Mode)!
            </strong>
            <span style={{ fontSize: "0.85rem", opacity: 0.9 }}>
              Order {orderId ? `№ ${orderId}` : ""} has been confirmed and placed with the studio.
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(34,197,94,0.2)", borderRadius: "4px" }}>
            TEST MODE
          </span>
        </section>
      )}

      <section className="simple-page-heading">
        <p>
          {user ? `Account (${user.name || user.mobile})` : "Account"} / Orders
        </p>
        <h1>Your orders.</h1>
      </section>

      {orders.length === 0 ? (
        <EmptyState title="No orders yet." text="Your completed orders will appear here." />
      ) : (
        <section className="orders-list">
          {orders.map((order) => (
            <article key={order.id}>
              <div className="order-number">
                <span>{order.status}</span>
                <h2>{order.id}</h2>
                <p>Placed {order.date}</p>
              </div>
              <div className="order-images">
                {order.items.slice(0, 3).map((item) => (
                  <img src={item.image} alt="" key={item.id} />
                ))}
              </div>
              <div>
                <span>{order.items.length} styles</span>
                <strong>{formatINR(order.total)}</strong>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

