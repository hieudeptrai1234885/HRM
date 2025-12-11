import express from "express";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  findEmployeeByName,
  getEmployeeProfile,
  getEmployeeStats,
} from "../controllers/employeeController.js";
import { getEmployeeByEmail } from "../controllers/employeeController.js";

const router = express.Router();   // ✅ TẠO ROUTER TRƯỚC

// ⭐ GET PROFILE
router.get("/profile/:id", getEmployeeProfile);

// ⭐ GET ALL EMPLOYEES
router.get("/", getEmployees);

// ⭐ ADD EMPLOYEE
router.post("/add", addEmployee);

// ⭐ THỐNG KÊ NHÂN SỰ
router.get("/stats", getEmployeeStats);

// ⭐ UPDATE EMPLOYEE
router.put("/:id", updateEmployee);
router.put("/update/:id", updateEmployee);

// ⭐ DELETE EMPLOYEE
router.delete("/:id", deleteEmployee);
router.delete("/delete/:id", deleteEmployee);

// ⭐ FIND EMPLOYEE BY NAME (FACE API)
router.post("/find-by-name", findEmployeeByName);
// 🔍 API lấy profile theo EMAIL
router.get("/profile/email/:email", getEmployeeByEmail);


export default router;
