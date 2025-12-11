import { useState } from "react";
import { Logo } from "../components/Logo";
import Input from "../components/Input";
import Button from "../components/Button";
import { HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);

    try {
      // STEP 1: Gửi login lên backend
      const loginRes = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setError(loginData.error || "Login failed");
        setLoading(false);
        return;
      }

      // Lưu thông tin user (kèm role) tạm thời để redirect sau khi OTP thành công
      if (loginData?.user) {
        localStorage.setItem("pendingUser", JSON.stringify(loginData.user));
      }
      localStorage.setItem("userEmail", email);

      // STEP 2: Gửi OTP
      const otpRes = await fetch("http://localhost:5000/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const otpData = await otpRes.json();

      if (!otpRes.ok) {
        setError(otpData.error || "Failed to send OTP");
        setLoading(false);
        return;
      }

      // STEP 3: Chuyển sang trang OTP
      navigate("/otp", {
        state: { email: email },
      });
    } catch (err) {
      setError("Không kết nối được server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ===== LEFT LOGIN PANEL ===== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* HEADER GIỮ NGUYÊN */}
          <div className="flex items-center justify-between mb-8">
            <Logo />
            <div className="flex items-center gap-4">
              <HelpCircle className="w-5 h-5 text-gray-400 cursor-pointer" />
              <span className="text-sm text-gray-600">HRM Login</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h1>
            <p className="text-gray-600 mb-8">
              Enter your personal details below to continue
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="text"
                placeholder="username hoặc email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                label="Email or Username"
                required
              />

              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                label="Password"
                required
              />

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-600">Keep me logged in</span>
                </label>

                <button
                  type="button"
                  className="text-sm text-gray-400 cursor-not-allowed"
                  disabled
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Login"}
              </Button>

              <div className="text-center text-gray-500 text-sm">OR</div>

              {/* ===== SOCIAL LOGIN ===== */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className="py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm">Google</span>
                </button>

                <button
                  type="button"
                  className="py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm">Facebook</span>
                </button>

                <button
                  type="button"
                  className="py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm">Twitter</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="hidden lg:flex w-1/2 bg-white items-center justify-center p-12">
        <div className="max-w-lg">
          <div className="bg-gray-100 rounded-2xl p-8 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4">Upcoming Schedule</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Team Briefing</p>
                    <p className="text-xs text-gray-500">09:00 AM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Control your Employees</h2>
            <p className="text-gray-600">
              With Our Smart Tool Invest intelligently and discover a better way
              to manage your entire Employees easily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
