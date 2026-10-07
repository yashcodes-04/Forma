import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { loadOrders } from "../data/orders";
import { authApi } from "../api/client";

export default function AdminCustomersPage() {
  const orders = loadOrders();
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  useEffect(() => {
    authApi.getCustomers().then((users) => {
      if (users && users.length > 0) {
        setDbUsers(users.filter((u) => u.role !== "admin"));
      }
    });
  }, []);

  const orderCustomerNames = [...new Set(orders.map((order) => order.customer))];
  const allCustomerNames = [
    ...new Set([...dbUsers.map((u) => u.name), ...orderCustomerNames]),
  ];

  return (
    <AdminLayout title="Customers" eyebrow="Community / Registered Profiles">
      <div className="admin-customer-grid">
        {allCustomerNames.length ? (
          allCustomerNames.map((customer) => {
            const customerOrders = orders.filter((order) => order.customer === customer);
            const userRecord = dbUsers.find((u) => u.name === customer);
            return (
              <article key={customer}>
                <span>{customer.slice(0, 1).toUpperCase()}</span>
                <h2>{customer}</h2>
                <p>
                  {userRecord?.mobile ? `${userRecord.mobile} · ` : ""}
                  {customerOrders.length} order{customerOrders.length === 1 ? "" : "s"}
                </p>
                {userRecord?.email && (
                  <small style={{ opacity: 0.7, fontSize: "11px", display: "block", marginTop: "4px" }}>
                    {userRecord.email}
                  </small>
                )}
              </article>
            );
          })
        ) : (
          <p className="admin-no-data">No registered customer profiles found.</p>
        )}
      </div>
    </AdminLayout>
  );
}
