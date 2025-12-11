import express from "express";
import {
  testDatabaseConnection,
  createSharedFile,
  getAccessibleFilesForEmployee,
  getAllSharedFiles,
  deleteSharedFile,
  addFilePermission,
  removeFilePermission,
  getFilePermissions,
} from "../controllers/sharedFileController.js";

const router = express.Router();

// Test kết nối database (để debug)
router.get("/test-db", testDatabaseConnection);

// Tạo file mới
router.post("/", createSharedFile);

// Lấy tất cả file (admin/manager)
router.get("/", getAllSharedFiles);

// Lấy file có thể truy cập của nhân viên
router.get("/employee/:employee_id", getAccessibleFilesForEmployee);

// Xóa file
router.delete("/:id", deleteSharedFile);

// Thêm quyền truy cập
router.post("/permission", addFilePermission);

// Xóa quyền truy cập
router.delete("/permission/:file_id/:employee_id", removeFilePermission);

// Lấy quyền truy cập của file
router.get("/permission/:file_id", getFilePermissions);

export default router;

