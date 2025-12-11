import express from "express";
import { 
    checkIn, 
    matchFace, 
    checkInOrOut, 
    getWeekAttendance 
} from "../controllers/attendanceController.js";

const router = express.Router();

// Ghi điểm danh (time_in)
router.post("/checkin", checkIn);

// Nhận diện khuôn mặt
router.post("/match-face", matchFace);

// Check IN hoặc OUT tự động
router.post("/check", checkInOrOut);

// Lấy lịch 7 ngày
router.get("/week/:email", getWeekAttendance);

export default router;
