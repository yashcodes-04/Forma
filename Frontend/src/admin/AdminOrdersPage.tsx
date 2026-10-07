import AdminLayout from "./AdminLayout";
import { formatINR } from "../data/catalog";
import { loadOrders } from "../data/orders";

export default function AdminOrdersPage() {
  const orders = loadOrders();

  return (
    <AdminLayout title="Orders" eyebrow="Operations / Fulfilment">
      <div className="admin-data-table">
        <div className="admin-data-row admin-data-head">
          <span>Order</span>
          <span>Customer</span>
          <span>Date</span>
          <span>Status</span>
          <span>Total</span>
        </div>
        {orders.length ? (
          orders.map((order) => (
            <div className="admin-data-row" key={order.id}>
              <strong>{order.id}</strong>
              <span>{order.customer}</span>
              <span>{order.date}</span>
              <span className="admin-status">{order.status}</span>
              <strong>{formatINR(order.total)}</strong>
            </div>
          ))
        ) : (
          <p className="admin-no-data">No customer orders have been placed yet.</p>
        )}
      </div>
    </AdminLayout>
  );
}
