import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { UserRole } from "../types/auth.ts";

export default function OtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(120);
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email; // lấy email từ Login

  // Đếm ngược 120s
  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const handleChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return; // chỉ cho số

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // tự động nhảy sang ô tiếp theo
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");

    if (code.length < 6) {
      setError("OTP phải đủ 6 số!");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await res.json();

      if (res.ok) {
        // Lấy user pending từ localStorage để biết role
        const pendingUser = localStorage.getItem("pendingUser");
        let redirectPath = "/dashboard";

        if (pendingUser) {
          try {
            const user = JSON.parse(pendingUser);
            const role = (user?.role || "").toLowerCase() as UserRole;
            if (role === "admin") redirectPath = "/admin";
            else if (role === "manager") redirectPath = "/manager";
            else redirectPath = "/staff";

            // Lưu user đã xác thực
            localStorage.setItem("currentUser", JSON.stringify(user));
          } catch (err) {
            console.error("Parse pendingUser error:", err);
          }
        }

        navigate(redirectPath, { replace: true });
      } else {
        setError(data.error || "OTP không hợp lệ!");
      }
    } catch (err) {
      setError("Không kết nối được server!");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold mb-4">Nhập mã OTP</h2>
        <p className="text-gray-500 mb-4">
          Mã OTP đã được gửi tới email:
          <br />
          <span className="text-blue-600 font-semibold">{email}</span>
        </p>

        {/* 6 ô nhập OTP */}
        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              maxLength={1}
              className="w-12 h-12 text-center border rounded-lg text-xl"
            />
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

        {/* Timer */}
        <p className="text-gray-500 text-sm mb-4">
          Còn lại:{" "}
          <span className="font-bold text-blue-600">{timer}s</span>
        </p>

        <button
          onClick={verifyOtp}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Xác nhận OTP
        </button>
      </div>
    </div>
  );
}
