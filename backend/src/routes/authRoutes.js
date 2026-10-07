import express from "express";
import { authController } from "../controllers/authController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", authController.sendOtp);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/admin-login", authController.adminLogin);
router.get("/check", authController.checkUser);
router.get("/customers", requireAdmin, authController.getCustomers);

export default router;
