import { db } from "../database/db.js";
import { getRazorpayInstance, verifyRazorpaySignature } from "../services/razorpayService.js";

/**
 * Create a Razorpay Test Mode Order
 * POST /api/payment/create-order
 */
export async function createPaymentOrder(req, res) {
  try {
    const {
      amount,
      currency = "INR",
      items = [],
      orderId: clientOrderId,
      customer = {},
      shippingAddress = {},
      userId,
    } = req.body;

    // 1. Amount validation
    if (amount === undefined || amount === null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment amount. Amount must be a positive number.",
      });
    }

    let finalAmount = Number(amount);

    // 2. Server-side Price Verification (Security Check: Prevent DevTools manipulation)
    if (Array.isArray(items) && items.length > 0) {
      let serverCalculatedSubtotal = 0;
      let hasValidDbProducts = false;

      for (const item of items) {
        if (item.id) {
          const dbProduct = db.prepare("SELECT price, stock, is_active FROM products WHERE id = ?").get(item.id);
          if (dbProduct) {
            hasValidDbProducts = true;
            const itemQty = Math.max(1, Number(item.quantity) || 1);
            serverCalculatedSubtotal += Number(dbProduct.price) * itemQty;
          }
        }
      }

      // If database products were found, enforce server truth
      if (hasValidDbProducts && serverCalculatedSubtotal > 0) {
        // Compare with frontend amount (allow small shipping fee difference if applicable)
        const diff = Math.abs(finalAmount - serverCalculatedSubtotal);
        if (diff > 500 && finalAmount < serverCalculatedSubtotal) {
          console.warn(
            `🚨 [SECURITY] Price mismatch detected: Client sent ₹${finalAmount}, but DB requires ₹${serverCalculatedSubtotal}`
          );
          return res.status(400).json({
            success: false,
            message: "Price mismatch detected. Order amount must match authoritative product pricing.",
          });
        }
        // Use authoritative server pricing
        finalAmount = serverCalculatedSubtotal;
      }
    }

    // 3. Convert INR to paise (Razorpay takes amount in smallest currency unit)
    const amountInPaise = Math.round(finalAmount * 100);

    const orderId = clientOrderId || `FRM-${Date.now().toString().slice(-7)}`;
    const receiptId = `rcpt_${orderId}`.slice(0, 40);

    // 4. Initialize Razorpay and create order
    let razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch (configErr) {
      console.warn("⚠️ Razorpay config warning:", configErr.message);
      return res.status(500).json({
        success: false,
        message: configErr.message,
      });
    }

    const razorpayOptions = {
      amount: amountInPaise,
      currency: currency.toUpperCase(),
      receipt: receiptId,
      notes: {
        orderId,
        customerName: customer.name || shippingAddress.name || "Customer",
        customerMobile: customer.mobile || shippingAddress.mobile || "",
        customerEmail: customer.email || "",
      },
    };

    const razorpayOrder = await razorpay.orders.create(razorpayOptions);

    console.log(
      `💳 [RAZORPAY TEST MODE] Order created: ${razorpayOrder.id} for ₹${finalAmount} (${amountInPaise} paise)`
    );

    // 5. Save or update pending order in database (Prevent duplicate orders on retry)
    try {
      const existingOrder = db.prepare("SELECT id FROM orders WHERE id = ?").get(orderId);
      const name = customer.name || shippingAddress.name || "Customer";
      const mobile = customer.mobile || shippingAddress.mobile || "";
      const address = shippingAddress.address || "";
      const city = shippingAddress.city || "";
      const pin = shippingAddress.pin || "";

      if (existingOrder) {
        // Update existing order with new Razorpay order ID
        db.prepare(`
          UPDATE orders SET 
            razorpay_order_id = ?,
            total = ?,
            currency = ?,
            payment_status = 'pending'
          WHERE id = ?
        `).run(razorpayOrder.id, finalAmount, currency, orderId);
      } else {
        // Insert new order with payment_status = 'pending'
        db.prepare(`
          INSERT INTO orders (
            id, user_id, customer_name, customer_mobile, shipping_address,
            city, pincode, subtotal, shipping_fee, total, status,
            payment_method, payment_status, razorpay_order_id, currency
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          orderId,
          userId || null,
          name,
          mobile,
          address,
          city,
          pin,
          finalAmount,
          0,
          finalAmount,
          "Pending Payment",
          "Razorpay",
          "pending",
          razorpayOrder.id,
          currency
        );
      }

      // ALWAYS insert or refresh order items (clearing any old draft items)
      if (Array.isArray(items) && items.length > 0) {
        try {
          db.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);
        } catch {
          // ignore
        }

        const insertItem = db.prepare(`
          INSERT INTO order_items (
            order_id, product_id, product_name, product_image, category, size, tone, price, quantity, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          const qty = Math.max(1, Number(item.quantity) || 1);
          const price = Number(item.price) || 0;

          // Resolve valid product_id in database to respect foreign key constraint
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
            price,
            qty,
            price * qty
          );
        }
      }
    } catch (dbErr) {
      console.warn("⚠️ Non-fatal DB record warning in createPaymentOrder:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully",
      order: razorpayOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
      internalOrderId: orderId,
    });
  } catch (err) {
    console.error("❌ Error creating Razorpay order:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create Razorpay payment order",
    });
  }
}

/**
 * Verify Razorpay Payment Signature
 * POST /api/payment/verify
 */
export async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // 1. Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification fields (order ID, payment ID, or signature).",
      });
    }

    // 2. Perform HMAC SHA256 Signature Verification
    const isSignatureValid = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isSignatureValid) {
      console.error(
        `🚨 [SECURITY] Razorpay signature verification FAILED for payment ${razorpay_payment_id} and order ${razorpay_order_id}`
      );

      // Mark order as failed in database if found
      if (orderId || razorpay_order_id) {
        try {
          db.prepare(`
            UPDATE orders SET 
              payment_status = 'failed',
              razorpay_payment_id = ?
            WHERE id = ? OR razorpay_order_id = ?
          `).run(razorpay_payment_id, orderId || "", razorpay_order_id);
        } catch {
          // ignore
        }
      }

      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid signature. Transaction could not be verified.",
      });
    }

    console.log(
      `✅ [PAYMENT VERIFIED] Payment ${razorpay_payment_id} verified successfully for Razorpay order ${razorpay_order_id}!`
    );

    // 3. Update Database: mark payment_status = 'paid' ONLY after successful verification
    let resolvedOrderId = orderId;
    try {
      const existing = db
        .prepare("SELECT id, total FROM orders WHERE id = ? OR razorpay_order_id = ?")
        .get(orderId || "", razorpay_order_id);

      if (existing) {
        resolvedOrderId = existing.id;
        db.prepare(`
          UPDATE orders SET 
            payment_status = 'paid',
            status = 'Confirmed',
            razorpay_payment_id = ?,
            razorpay_signature = ?
          WHERE id = ?
        `).run(razorpay_payment_id, razorpay_signature, existing.id);

        // Deduct stock for order items
        try {
          const items = db.prepare("SELECT product_id, product_name, quantity FROM order_items WHERE order_id = ?").all(existing.id);
          const updateStockById = db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?");
          const updateStockByName = db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE name = ?");
          for (const item of items) {
            if (item.product_id) {
              updateStockById.run(item.quantity, item.product_id);
            } else if (item.product_name) {
              updateStockByName.run(item.quantity, item.product_name);
            }
          }
        } catch (stockErr) {
          console.warn("Stock update notice:", stockErr.message);
        }
      }
    } catch (dbErr) {
      console.error("Database update error after payment verification:", dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        orderId: resolvedOrderId,
        razorpay_order_id,
        razorpay_payment_id,
        payment_status: "paid",
      },
    });
  } catch (err) {
    console.error("Error verifying payment:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error during payment verification",
    });
  }
}

/**
 * Handle Payment Failure / Cancellation notification
 * POST /api/payment/failed
 */
export async function recordPaymentFailure(req, res) {
  try {
    const { orderId, razorpay_order_id, reason } = req.body;

    if (orderId || razorpay_order_id) {
      db.prepare(`
        UPDATE orders SET 
          payment_status = 'failed',
          status = 'Payment Cancelled'
        WHERE (id = ? OR razorpay_order_id = ?) AND payment_status != 'paid'
      `).run(orderId || "", razorpay_order_id || "");
    }

    console.log(`⚠️ [PAYMENT CANCELLED/FAILED] Order ${orderId || razorpay_order_id}: ${reason || "User closed or failed"}`);

    return res.json({
      success: true,
      message: "Payment failure recorded. Order was not charged.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
