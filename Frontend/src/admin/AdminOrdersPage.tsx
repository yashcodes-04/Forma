import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { formatINR } from "../data/catalog";
import { loadOrders } from "../data/orders";
import { orderApi } from "../api/client";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>(loadOrders);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const serverOrders = await orderApi.getAdminOrders();
      if (serverOrders && serverOrders.length > 0) {
        // Map backend database format to display format
        const formatted = serverOrders.map((o: any) => ({
          id: o.id,
          customer: o.customer_name || o.customer || "Customer",
          customerMobile: o.customer_mobile || o.customerMobile || "",
          date: o.created_at
            ? new Date(o.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : o.date || "Recent",
          status: o.status || "Confirmed",
          paymentStatus: o.payment_status || o.paymentStatus || "pending",
          total: Number(o.total) || 0,
          items: o.items || [],
        }));
        setOrders(formatted);
      } else {
        // Fallback to local storage if server returned empty
        setOrders(loadOrders());
      }
    } catch {
      setOrders(loadOrders());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <AdminLayout title="Orders" eyebrow="Operations / Fulfilment">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button
          onClick={fetchOrders}
          style={{
            background: "#222",
            color: "#fff",
            border: "1px solid #444",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {loading ? "Refreshing..." : "↻ Refresh Orders"}
        </button>
      </div>

      <div className="admin-data-table">
        <div className="admin-data-row admin-data-head">
          <span>Order</span>
          <span>Customer</span>
          <span>Date</span>
          <span>Payment</span>
          <span>Status</span>
          <span>Total</span>
        </div>
        {orders.length ? (
          orders.map((order) => (
            <div className="admin-data-row" key={order.id}>
              <strong>{order.id}</strong>
              <span>
                {order.customer}
                {order.customerMobile && (
                  <small style={{ display: "block", color: "#888", fontSize: "0.75rem" }}>
                    {order.customerMobile}
                  </small>
                )}
              </span>
              <span>{order.date}</span>
              <span
                style={{
                  color: order.paymentStatus === "paid" ? "#22c55e" : order.paymentStatus === "failed" ? "#ef4444" : "#eab308",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                }}
              >
                {order.paymentStatus || "pending"}
              </span>
              <span className="admin-status">{order.status}</span>
              <strong>{formatINR(order.total)}</strong>
            </div>
          ))
        ) : (
          <p className="admin-no-data">
            {loading ? "Loading customer orders from server..." : "No customer orders have been placed yet."}
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
