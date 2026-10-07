import type { CartItem } from "./cart";
import type { User } from "../auth/AuthContext";

export type Order = {
  id: string;
  userId?: string;
  userMobile?: string;
  userEmail?: string;
  date: string;
  status: "Confirmed" | "Packed" | "Shipped" | "Delivered";
  total: number;
  items: CartItem[];
  customer: string;
  customerMobile?: string;
  shippingAddress?: {
    address: string;
    city: string;
    pin: string;
    mobile: string;
    name: string;
  };
};

const ORDERS_KEY = "formaOrders";

/**
 * Load all orders in the system (used by Studio Admin)
 */
export function loadAllOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]") as Order[];
  } catch {
    return [];
  }
}

/**
 * Backwards-compatible loadOrders for admin/fallback
 */
export function loadOrders(): Order[] {
  return loadAllOrders();
}

/**
 * Load ONLY the orders belonging to the specified user
 * Enforces strict user privacy isolation
 */
export function loadUserOrders(user: User | null): Order[] {
  if (!user) {
    return [];
  }

  // Studio Admin can view all orders
  if (user.role === "admin") {
    return loadAllOrders();
  }

  const allOrders = loadAllOrders();
  const cleanUserMobile = (user.mobile || "").replace(/\D/g, "");
  const normalizedEmail = (user.email || "").toLowerCase().trim();

  return allOrders.filter((order) => {
    // 1. Match by explicit User ID
    if (order.userId && order.userId === user.id) {
      return true;
    }

    // 2. Match by mobile number
    if (cleanUserMobile && order.userMobile) {
      const orderMobile = order.userMobile.replace(/\D/g, "");
      if (orderMobile.length >= 10 && cleanUserMobile.endsWith(orderMobile.slice(-10))) {
        return true;
      }
    }

    if (cleanUserMobile && order.customerMobile) {
      const customerMobile = order.customerMobile.replace(/\D/g, "");
      if (customerMobile.length >= 10 && cleanUserMobile.endsWith(customerMobile.slice(-10))) {
        return true;
      }
    }

    // 3. Match by verified email
    if (normalizedEmail && order.userEmail) {
      if (order.userEmail.toLowerCase().trim() === normalizedEmail) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Save an order to the persistent store with user ownership
 */
export function saveOrder(order: Order) {
  const orders = loadAllOrders();
  // Ensure the new order is placed at the beginning of the list
  const nextOrders = [order, ...orders.filter((o) => o.id !== order.id)];
  localStorage.setItem(ORDERS_KEY, JSON.stringify(nextOrders));
}

