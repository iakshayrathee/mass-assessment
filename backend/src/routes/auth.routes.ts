import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/login", authController.login);
router.get("/profile", authenticate, authController.getProfile);

export default router;
