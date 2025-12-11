import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";

// Pages
import Login from "./pages/Login";
import OtpPage from "./pages/OtpPage";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import AddEmployee from "./pages/AddEmployee";
import Profile from "./pages/Settings";
import { Settings } from "lucide-react";
import type { AuthUser } from "./types/auth.ts";
import StaffDashboard from "./pages/StaffDashboard";
import ManagementDashboard from "./pages/ManagementDashboard";

function RequireRole({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: string[];
}) {
  const stored = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
  const user: AuthUser | null = stored ? JSON.parse(stored) : null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes((user.role || "").toLowerCase())) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}


export default function App() {
  return (
    <Router>
      <Routes>

        {/* Trang mặc định */}
        <Route path="/" element={<Login />} />

        {/* Nhập OTP */}
        <Route path="/otp" element={<OtpPage />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <RequireRole>
              <Dashboard />
            </RequireRole>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireRole allowedRoles={["admin"]}>
              <Dashboard />
            </RequireRole>
          }
        />
        <Route
          path="/manager"
          element={
            <RequireRole allowedRoles={["manager"]}>
              <ManagementDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/staff"
          element={
            <RequireRole allowedRoles={["staff"]}>
              <StaffDashboard />
            </RequireRole>
          }
        />

        {/* Danh sách nhân viên */}
        <Route
          path="/employees"
          element={
            <RequireRole>
              <Employees />
            </RequireRole>
          }
        />

        {/* Thêm nhân viên */}
        <Route
          path="/employees/add"
          element={
            <RequireRole allowedRoles={["admin", "manager"]}>
              <AddEmployee />
            </RequireRole>
          }
        />

        {/* ⭐ ROUTE TRANG CÁ NHÂN */}
        <Route
          path="/profile"
          element={
            <RequireRole>
              <Profile />
            </RequireRole>
          }
        />
        <Route
          path="/Settings"
          element={
            <RequireRole>
              <Settings />
            </RequireRole>
          }
        />

        {/* Bắt route sai → quay về Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
       


      </Routes>
    </Router>
  );
}
