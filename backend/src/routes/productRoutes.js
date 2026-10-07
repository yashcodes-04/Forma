import { Router } from "express";
import {
  getProducts,
  getProductById,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  updateStock,
  deleteProduct,
} from "../controllers/productController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// Public Routes
router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:id", getProductById);

// Admin Protected Routes
router.post("/", requireAdmin, createProduct);
router.put("/:id", requireAdmin, updateProduct);
router.patch("/:id/stock", requireAdmin, updateStock);
router.delete("/:id", requireAdmin, deleteProduct);

export default router;
