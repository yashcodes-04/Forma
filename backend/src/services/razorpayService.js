import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

/**
 * Get configured Razorpay instance (Strictly Test Mode)
 */
export function getRazorpayInstance() {
  dotenv.config({ override: true });
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id === "rzp_test_xxxxxxxxx" || key_secret === "xxxxxxxxxxxxxxxx") {
    throw new Error(
      "Razorpay Test Mode credentials not configured. Please set RAZORPAY_KEY_ID (rzp_test_...) and RAZORPAY_KEY_SECRET in backend/.env"
    );
  }

  // Safety check: ensure TEST MODE key only
  if (!key_id.startsWith("rzp_test_")) {
    throw new Error(
      "CRITICAL SECURITY: Only Razorpay Test Mode keys (rzp_test_...) are permitted. Live mode is prohibited in development."
    );
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Verify Razorpay payment signature using HMAC SHA256
 */
export function verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  dotenv.config({ override: true });
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) {
    return false;
  }

  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(text)
      .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf-8");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (err) {
    console.error("Signature verification error:", err.message);
    return false;
  }
}
