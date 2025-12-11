import express from "express";
import { 
    checkIn, 
    getWeek,
    getTodayAttendance
} from "../controllers/attendanceController.js";

const router = express.Router();

// Check-in hoặc Check-out tự động
router.post("/checkin", checkIn);

// Lấy attendance hôm nay
router.get("/today/:employee_id", getTodayAttendance);

// Lấy lịch 7 ngày
router.get("/week/:email", getWeek);

export default router;
