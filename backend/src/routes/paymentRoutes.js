import express from "express";
import {
  createPaymentOrder,
  verifyPayment,
  recordPaymentFailure,
} from "../controllers/paymentController.js";

const router = express.Router();

// POST /api/payment/create-order - Create Razorpay Test Order
router.post("/create-order", createPaymentOrder);

// POST /api/payment/verify - Verify HMAC SHA256 Signature
router.post("/verify", verifyPayment);

// POST /api/payment/failed - Record failed / cancelled payment
router.post("/failed", recordPaymentFailure);

export default router;
