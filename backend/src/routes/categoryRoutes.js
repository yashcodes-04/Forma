import { Router } from "express";
import { getCategories, createCategory } from "../controllers/categoryController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", getCategories);
router.post("/", requireAdmin, createCategory);

export default router;
