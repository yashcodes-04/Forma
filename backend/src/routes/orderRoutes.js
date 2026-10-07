import express from "express";
import { getOrders, createOrder } from "../controllers/orderController.js";

const router = express.Router();

// GET /api/orders (supports ?userId=&mobile= or admin header)
router.get("/", getOrders);

// POST /api/orders
router.post("/", createOrder);

export default router;
