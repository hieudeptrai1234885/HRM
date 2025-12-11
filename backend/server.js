import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import "./config/db.js"; // chạy kết nối MySQL
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import documentAccessRoutes from "./routes/documentAccessRoutes.js";
import sharedFileRoutes from "./routes/sharedFileRoutes.js";

dotenv.config();

console.log("📦 Đang khởi tạo routes...");

const app = express();

app.use(cors());
app.use(express.json());

// Logging middleware để debug routes
app.use((req, res, next) => {
  if (req.path.includes("/shared-files")) {
    console.log(`🔍 Request đến: ${req.method} ${req.path}`);
  }
  next();
});

app.use("/api/users", userRoutes);
// Auth API
app.use("/api/auth", authRoutes);

app.use("/api/employees", employeeRoutes);

app.use("/api/attendance", attendanceRoutes);
// OTP API
app.use("/api/otp", otpRoutes);
// Document Access API
app.use("/api/document-access", documentAccessRoutes);
// Shared Files API
try {
  app.use("/api/shared-files", sharedFileRoutes);
  console.log("✅ Route /api/shared-files đã được đăng ký");
} catch (err) {
  console.error("❌ Lỗi đăng ký route /api/shared-files:", err);
}

// Test route
app.get("/", (req, res) => {
  res.send("Backend HRM đang chạy...");
});

// 404 handler cho routes không tồn tại
app.use((req, res) => {
  console.log(`⚠️ Route không tìm thấy: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "Route không tìm thấy",
    method: req.method,
    path: req.path,
    availableRoutes: [
      "GET /api/shared-files",
      "POST /api/shared-files",
      "GET /api/shared-files/test-db",
      "GET /api/shared-files/employee/:employee_id",
      "DELETE /api/shared-files/:id",
    ]
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚀 Server chạy tại cổng " + PORT);
  console.log("📋 Các routes đã đăng ký:");
  console.log("   - GET/POST /api/shared-files");
  console.log("   - GET /api/shared-files/test-db");
  console.log("   - GET /api/shared-files/employee/:employee_id");
});
