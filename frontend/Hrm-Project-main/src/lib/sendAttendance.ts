import { checkInApi } from "../api/attendanceAPI";

export default async function sendAttendance(descriptor: Float32Array) {
  try {
    console.log("📤 Gửi descriptor lên backend...");

    const matchRes = await fetch("http://localhost:5000/api/attendance/match-face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor: Array.from(descriptor) })
    });

    const match = await matchRes.json();

    if (!match || !match.name) {
      console.log("❌ Backend không match được khuôn mặt");
      return null;
    }

    console.log("👍 MATCH:", match);

    // Gửi request chấm công
    const result = await checkInApi({   
      employee_id: match.id,
      name: match.name
    });

    if (result.success) {
      return match.name;
    }

    return null;

  } catch (err) {
    console.error("❌ Lỗi sendAttendance():", err);
    return null;
  }
}
