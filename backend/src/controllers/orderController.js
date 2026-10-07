import { db } from "../database/db.js";

/**
 * Get orders with role and user-based isolation
 * GET /api/orders
 * Query params: userId, mobile
 */
export async function getOrders(req, res) {
  try {
    const adminHeader = req.headers["x-admin-role"] || req.headers["x-role"];
    const { userId, mobile } = req.query;

    let rows;
    if (adminHeader === "admin") {
      // Admin sees all orders
      rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
    } else if (userId || mobile) {
      // Filter strictly by user ID or mobile number
      let cleanMobile = (mobile || "").replace(/\D/g, "");
      if (cleanMobile.length > 10) cleanMobile = cleanMobile.slice(-10);

      rows = db
        .prepare(
          `SELECT * FROM orders 
           WHERE (user_id IS NOT NULL AND user_id = ?) 
              OR (customer_mobile LIKE ?)
           ORDER BY created_at DESC`
        )
        .all(userId || "", `%${cleanMobile}%`);
    } else {
      // Unauthenticated non-admin gets empty list
      return res.json({ success: true, data: [] });
    }

    // Attach order items
    const ordersWithItems = rows.map((order) => {
      const items = db
        .prepare("SELECT * FROM order_items WHERE order_id = ?")
        .all(order.id);
      return {
        ...order,
        items,
      };
    });

    res.json({
      success: true,
      data: ordersWithItems,
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Place a new order
 * POST /api/orders
 */
export async function createOrder(req, res) {
  try {
    const {
      id,
      userId,
      customer,
      customerMobile,
      shippingAddress,
      total,
      subtotal,
      shippingFee = 0,
      status = "Confirmed",
      paymentMethod = "Prepaid",
      paymentStatus = "Paid",
      items = [],
    } = req.body;

    const totalItemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (totalItemCount > 50) {
      return res.status(400).json({
        success: false,
        message: "Maximum limit of 50 items per order exceeded.",
      });
    }

    // Verify stock availability
    for (const item of items) {
      if (item.id) {
        const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(item.id);
        if (prod && prod.stock < (item.quantity || 1)) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${prod.name}. Available: ${prod.stock}`,
          });
        }
      }
    }

    const orderId = id || `FRM-${Date.now().toString().slice(-7)}`;
    const addressText = shippingAddress?.address || "";
    const city = shippingAddress?.city || "";
    const pincode = shippingAddress?.pin || "";
    const name = customer || shippingAddress?.name || "Customer";
    const mobile = customerMobile || shippingAddress?.mobile || "";

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, user_id, customer_name, customer_mobile, shipping_address, 
        city, pincode, subtotal, shipping_fee, total, status, payment_method, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      orderId,
      userId || null,
      name,
      mobile,
      addressText,
      city,
      pincode,
      subtotal || total,
      shippingFee,
      total,
      status,
      paymentMethod,
      paymentStatus
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, product_image, category, size, tone, price, quantity, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?
    `);

    for (const item of items) {
      const qty = item.quantity || 1;
      let resolvedProductId = null;
      if (item.id) {
        const prod = db.prepare("SELECT id FROM products WHERE id = ?").get(item.id);
        if (prod) resolvedProductId = prod.id;
      }
      if (!resolvedProductId && (item.name || item.slug)) {
        const prod = db.prepare("SELECT id FROM products WHERE name = ? OR slug = ?").get(item.name || "", item.slug || "");
        if (prod) resolvedProductId = prod.id;
      }

      insertItem.run(
        orderId,
        resolvedProductId,
        item.name || "Item",
        item.image || "",
        item.category || "Apparel",
        item.size || "Standard",
        item.tone || "",
        item.price || 0,
        qty,
        (item.price || 0) * qty
      );

      if (resolvedProductId) {
        updateStock.run(qty, resolvedProductId);
      }
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: {
        id: orderId,
        total,
        status,
        customer: name,
      },
    });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}
