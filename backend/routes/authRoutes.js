import express from "express";
import { login } from "../controllers/authController.js";

const router = express.Router();

// ⭐ ROUTE LOGIN DUY NHẤT
router.post("/login", login);

export default router;
