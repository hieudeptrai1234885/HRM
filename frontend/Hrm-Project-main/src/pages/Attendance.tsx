import { useState } from "react";
import FaceAttendanceModal from "../components/FaceAttendanceModal";

// Hàm kiểm tra check-in muộn
const isLateCheckIn = (checkInTime: string | null, shiftStart: string): boolean => {
  if (!checkInTime) return false;
  
  // Parse thời gian check-in (format: "HH:mm")
  const [checkInHour, checkInMinute] = checkInTime.split(':').map(Number);
  const checkInMinutes = checkInHour * 60 + checkInMinute;
  
  // Parse thời gian ca làm (format: "HH:mm")
  const [shiftHour, shiftMinute] = shiftStart.split(':').map(Number);
  const shiftMinutes = shiftHour * 60 + shiftMinute;
  
  // Nếu check-in sau giờ ca làm thì muộn
  return checkInMinutes > shiftMinutes;
};

export default function Attendance() {
  const [attendance, setAttendance] = useState<any>({
    check_in: null,
    check_out: null,
    check_in_name: null,
    check_out_name: null,
    check_in_location: null,
    check_out_location: null,
    shift_start: "08:00",
    shift_end: "17:00",
  });
  const [showModal, setShowModal] = useState(false);

  // Hàm xử lý khi nhận diện thành công
  const handleAttendanceSuccess = (data: {
    name: string;
    time: string;
    type?: "checkin" | "checkout";
    location?: string;
  }) => {
    console.log("✅ Nhận diện thành công:", data);

    // Xác định loại điểm danh
    const attendanceType = data.type || (!attendance.check_in ? "checkin" : "checkout");

    setAttendance((prev: any) => {
      if (attendanceType === "checkin") {
        // Check-in
        return {
          ...prev,
          check_in: data.time,
          check_in_name: data.name,
          check_in_location: data.location || prev.check_in_location,
        };
      } else {
        // Check-out
        return {
          ...prev,
          check_out: data.time,
          check_out_name: data.name,
          check_out_location: data.location || prev.check_out_location,
        };
      }
    });

    // Đóng modal sau 2 giây
    setTimeout(() => {
      setShowModal(false);
    }, 2000);
  };

  // Hàm xử lý check-out trực tiếp (không cần nhận diện)
  const handleCheckOut = () => {
    const currentTime = new Date().toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Sử dụng tên từ check-in hoặc mặc định
    const name = attendance.check_in_name || "Nhân viên";
    
    setAttendance((prev: any) => ({
      ...prev,
      check_out: currentTime,
      check_out_name: name,
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Chấm Công Hôm Nay</h1>

      <div className="bg-white shadow-md rounded-xl p-6 mb-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-3">Thông tin ca làm hôm nay</h2>

        <p>
          <strong>Giờ làm:</strong> {attendance.shift_start} – {attendance.shift_end}
        </p>

        {attendance.check_in ? (
          <p>
            <strong>Check-in:</strong>{" "}
            <span className={`font-semibold ${
              isLateCheckIn(attendance.check_in, attendance.shift_start) 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {attendance.check_in_name} - {attendance.check_in}
              {isLateCheckIn(attendance.check_in, attendance.shift_start) && (
                <span className="ml-2 text-red-600 text-sm">⚠️ Muộn</span>
              )}
            </span>
            {attendance.check_in_location && (
              <div className="text-sm text-slate-600 mt-1">
                <strong>Vị trí:</strong> {attendance.check_in_location}
              </div>
            )}
          </p>
        ) : (
          <p className="text-red-600">
            <strong>Chưa check-in</strong>
          </p>
        )}

        {attendance.check_out ? (
          <p>
            <strong>Check-out:</strong>{" "}
            <span className="text-blue-600 font-semibold">
              {attendance.check_out_name} - {attendance.check_out}
            </span>
            {attendance.check_out_location && (
              <div className="text-sm text-slate-600 mt-1">
                <strong>Vị trí:</strong> {attendance.check_out_location}
              </div>
            )}
          </p>
        ) : (
          <p className="text-orange-600">
            <strong>Chưa check-out</strong>
          </p>
        )}
      </div>

      {/* 🔥 CÁC NÚT ĐIỂM DANH */}
      <div className="flex gap-4">
        {!attendance.check_in ? (
          // Chưa check-in → Hiển thị nút check-in
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
          >
            Check-in bằng khuôn mặt
          </button>
        ) : (
          // Đã check-in → Hiển thị nút check-out
          <>
            {!attendance.check_out && (
              <button
                onClick={handleCheckOut}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg shadow hover:bg-orange-700 transition"
              >
                Check-out
              </button>
            )}
            <button
              onClick={() => {
                // Mở modal với type checkout
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
            >
              Check-out bằng khuôn mặt
            </button>
          </>
        )}
      </div>

      {/* MODAL NHẬN DIỆN KHUÔN MẶT */}
      {showModal && (
        <FaceAttendanceModal
          onClose={() => setShowModal(false)}
          onSuccess={handleAttendanceSuccess}
          defaultType={attendance.check_in ? "checkout" : "checkin"}
        />
      )}
    </div>
  );
}
