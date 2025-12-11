import express from "express";
import {
  logFileAccess,
  getSuspiciousActivities,
  getEmployeeAccessHistory,
  getAccessibleFiles,
  getAllEmployeesWithAccessInfo,
} from "../controllers/documentAccessController.js";

const router = express.Router();

// Log truy cập file
router.post("/log", logFileAccess);

// Lấy danh sách hoạt động bất thường
router.get("/suspicious", getSuspiciousActivities);

// Lấy lịch sử truy cập của nhân viên
router.get("/employee/:employee_id", getEmployeeAccessHistory);

// Lấy danh sách file có thể truy cập
router.get("/accessible/:employee_id", getAccessibleFiles);

// Lấy danh sách tất cả nhân viên với thông tin quyền truy cập
router.get("/employees-with-access", getAllEmployeesWithAccessInfo);

export default router;

