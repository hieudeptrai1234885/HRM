import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import "./config/db.js"; // chạy kết nối MySQL
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import userRoutes from "./routes/userRoutes.js";
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/users", userRoutes);
// Auth API
app.use("/api/auth", authRoutes);

app.use("/api/employees", employeeRoutes);

app.use("/api/attendance", attendanceRoutes);
// OTP API
app.use("/api/otp", otpRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Backend HRM đang chạy...");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚀 Server chạy tại cổng " + PORT);
});
