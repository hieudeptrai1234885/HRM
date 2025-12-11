import { useEffect, useMemo, useState } from "react";
import Attendance from "./Attendance";
import { mockSchedules, mockEmployees } from "../data/mockData";
import type { AuthUser } from "../types/auth.ts";
import { Calendar as CalendarIcon, Link2, LogOut, ClipboardList, ScanFace, FileText, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logFileAccess } from "../api/documentAccessAPI";
import { getTodayAttendance } from "../api/attendanceAPI";
import { getAccessibleFilesForEmployee, type SharedFile as APISharedFile } from "../api/sharedFileAPI";

interface ManagerTask {
  id: string;
  title: string;
  description: string;
  type: string;
  assigned_to: string;
  assigned_to_id?: string;
  assigned_to_email?: string;
  assignee_name: string;
  start_time: string;
  end_time: string;
}

interface SharedFile {
  id: number | string;
  name: string;
  url: string;
  audience: "staff" | "all" | "single";
  assigned_to_email?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  permission_type?: "view" | "download" | "both";
}

const TASK_STORAGE_KEY = "managerTasks";
const FILE_STORAGE_KEY = "sharedFiles";

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeSection, setActiveSection] = useState<string>("section-tasks");
  const [todayAttendance, setTodayAttendance] = useState<{
    check_in: string | null;
    check_out: string | null;
    location?: string;
  } | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        // Load today's attendance
        if (user?.id) {
          loadTodayAttendance(user.id);
        }
      } catch (err) {
        console.error("Parse currentUser error:", err);
      }
    }
  }, []);

  const loadTodayAttendance = async (employeeId: number) => {
    setLoadingAttendance(true);
    try {
      const attendance = await getTodayAttendance(employeeId);
      setTodayAttendance(attendance);
    } catch (error) {
      console.error("Lỗi tải thông tin điểm danh:", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const [managerTasks, setManagerTasks] = useState<ManagerTask[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
    if (savedTasks) {
      try {
        setManagerTasks(JSON.parse(savedTasks));
      } catch (err) {
        console.error("Parse tasks error:", err);
      }
    }
  }, []);

  // Load files from database
  useEffect(() => {
    const loadFiles = async () => {
      if (!currentUser?.id) {
        console.log("⚠️ Không có currentUser.id, bỏ qua load files");
        return;
      }
      try {
        setLoadingFiles(true);
        // Đảm bảo id là number
        const employeeId = typeof currentUser.id === 'string' ? parseInt(currentUser.id) : currentUser.id;
        if (isNaN(employeeId) || employeeId <= 0) {
          console.error(`❌ Employee ID không hợp lệ: ${currentUser.id}`);
          return;
        }
        console.log(`📥 Đang tải file cho nhân viên ID: ${employeeId} (type: ${typeof employeeId})`);
        const data = await getAccessibleFilesForEmployee(employeeId);
        console.log("📦 Dữ liệu file nhận được:", data);
        
        if (data.error) {
          console.error("❌ Lỗi từ API:", data.error);
          // Fallback to localStorage if API fails
          const savedFiles = localStorage.getItem(FILE_STORAGE_KEY);
          if (savedFiles) {
            try {
              setSharedFiles(JSON.parse(savedFiles));
            } catch (parseErr) {
              console.error("Parse files error:", parseErr);
            }
          }
          return;
        }
        
        if (Array.isArray(data)) {
          const convertedFiles: SharedFile[] = data.map((file: APISharedFile) => ({
            id: file.id,
            name: file.name,
            url: file.url,
            audience: file.audience,
            permission_type: file.permission_type,
          }));
          console.log(`✅ Đã tải ${convertedFiles.length} file cho nhân viên`);
          setSharedFiles(convertedFiles);
        } else {
          console.warn("⚠️ Dữ liệu không phải là array:", data);
        }
      } catch (err) {
        console.error("❌ Load files error:", err);
        // Fallback to localStorage if API fails
        const savedFiles = localStorage.getItem(FILE_STORAGE_KEY);
        if (savedFiles) {
          try {
            setSharedFiles(JSON.parse(savedFiles));
          } catch (parseErr) {
            console.error("Parse files error:", parseErr);
          }
        }
      } finally {
        setLoadingFiles(false);
      }
    };
    loadFiles();
  }, [currentUser?.id]);

  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    const empId = currentUser.id?.toString();
    const email = currentUser.email;
    const assigned = managerTasks.filter(
      (item) =>
        item.assigned_to_email === email ||
        item.assigned_to_id === empId ||
        item.assigned_to === email ||
        item.assigned_to === empId
    );
    const mock = mockSchedules.filter(
      (item) => item.assigned_to === email || item.assigned_to === empId
    );
    return [...assigned, ...mock];
  }, [currentUser, managerTasks]);

  // Files are already filtered by API, so we can use them directly
  const visibleFiles = useMemo(() => {
    return sharedFiles;
  }, [sharedFiles]);

  const getAssigneeName = (id: string) => {
    const found = mockEmployees.find((e) => e.id === id);
    return found?.full_name || "Me";
  };

  const stats = useMemo(() => {
    return {
      taskCount: myTasks.length,
      fileCount: visibleFiles.length,
    };
  }, [myTasks.length, visibleFiles.length]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("pendingUser");
    localStorage.removeItem("userEmail");
    navigate("/", { replace: true });
  };

  const handleFileClick = async (file: SharedFile, action: "view" | "download") => {
    if (!currentUser?.id) return;

    // Check permission for download
    if (action === "download" && file.permission_type === "view") {
      console.warn("Bạn không có quyền tải file này, chỉ có thể xem.");
      return;
    }

    // Lấy vị trí nếu có
    let location: string | undefined;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          location = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        },
        () => {
          // Ignore location error
        }
      );
    }

    // Log truy cập file
    try {
      const fileId = typeof file.id === "string" ? file.id : file.id.toString();
      await logFileAccess({
        employee_id: currentUser.id,
        file_id: fileId,
        file_name: file.name,
        file_url: file.url,
        action: action,
        location: location,
      });
    } catch (error) {
      console.error("Lỗi log truy cập file:", error);
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case "Critical":
        return "bg-red-50 text-red-700";
      case "Urgent":
        return "bg-amber-50 text-amber-700";
      case "Routine":
        return "bg-green-50 text-green-700";
      default:
        return "bg-blue-50 text-blue-700";
    }
  };

  const isLate = (checkInTime: string) => {
    const checkTime = new Date(checkInTime);
    const workStart = new Date(checkTime);
    workStart.setHours(8, 0, 0, 0);
    return checkTime > workStart;
  };

  const menuItems = [
    { id: "section-tasks", label: "Công việc được giao", icon: ClipboardList, color: "text-indigo-600", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
    { id: "section-attendance", label: "Điểm danh", icon: ScanFace, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
    { id: "section-files", label: "Tài liệu", icon: FileText, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
    { id: "section-profile", label: "Thông tin cá nhân", icon: User, color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Menu */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm flex-shrink-0">
        <div className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Menu</p>
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? `${item.bgColor} ${item.borderColor} ${item.color} border-l-4`
                      : "text-gray-700 hover:bg-gray-50 border-l-4 border-transparent"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? item.color : "text-gray-500"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 bg-gray-50 p-4 md:p-6 w-full max-w-full">
          {/* Header */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white rounded-2xl p-6 shadow-lg">
            <div>
              <p className="text-sm text-indigo-100">Xin chào</p>
              <h1 className="text-3xl font-bold">
                {currentUser?.full_name || currentUser?.email || "Nhân viên"}
              </h1>
              <p className="text-sm text-indigo-100">
                Vai trò: {currentUser?.role || "staff"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm bg-white/15 border border-white/20 rounded-lg px-4 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>Xem công việc được giao, điểm danh và tài liệu</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 hover:bg-red-600 px-4 py-2 text-white shadow-sm transition"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <p className="text-sm text-gray-500">Bộ phận</p>
              <p className="text-2xl font-bold text-indigo-700">{currentUser?.department || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <p className="text-sm text-gray-500">Chức danh</p>
              <p className="text-2xl font-bold text-blue-700">{currentUser?.position || "N/A"}</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <p className="text-sm text-gray-500">Tóm tắt</p>
              <p className="text-2xl font-bold text-cyan-700">
                {stats.taskCount} việc • {stats.fileCount} tài liệu
              </p>
            </div>
          </div>

          {/* Tasks Section */}
          {activeSection === "section-tasks" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6 shadow-sm w-full max-w-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-1 rounded-full bg-indigo-500" />
                    <h2 className="text-xl font-bold text-gray-900">Công việc được giao</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Danh sách công việc từ quản lý</p>
                </div>
              </div>

              {myTasks.length === 0 ? (
                <p className="text-sm text-gray-500">Hiện chưa có công việc được giao.</p>
              ) : (
                <div className="space-y-3 w-full">
                  {myTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex items-start justify-between hover:bg-gray-100 transition w-full"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                          <span className={`px-2 py-0.5 rounded ${typeBadge(task.type)}`}>
                            {task.type}
                          </span>
                          <CalendarIcon className="h-3 w-3" />
                          <span>
                            {new Date(task.start_time).toLocaleString("vi-VN")} -{" "}
                            {new Date(task.end_time).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <h4 className="font-semibold text-gray-800 break-words">{task.title}</h4>
                        <p className="text-sm text-gray-600 break-words">{task.description}</p>
                        <p className="text-xs text-gray-500 break-words">
                          Giao cho: {getAssigneeName(task.assigned_to)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendance Section */}
          {activeSection === "section-attendance" && (
            <div className="space-y-4">
              {/* Today's Shift Info */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Thông tin ca làm hôm nay</h3>
                {loadingAttendance ? (
                  <p className="text-sm text-gray-500">Đang tải thông tin...</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold text-gray-900">Giờ làm: </span>
                      <span className="text-gray-700">08:00 – 17:00</span>
                    </div>
                    {todayAttendance?.check_in ? (
                      <>
                        <div>
                          <span className="font-semibold text-gray-900">Check-in: </span>
                          <span
                            className={
                              isLate(todayAttendance.check_in)
                                ? "text-red-600 font-medium"
                                : "text-gray-700"
                            }
                          >
                            {currentUser?.full_name || currentUser?.email || "Nhân viên"} - {todayAttendance.check_in}
                            {isLate(todayAttendance.check_in) && (
                              <span className="ml-1">⚠️ Muộn</span>
                            )}
                          </span>
                        </div>
                        {todayAttendance.location && (
                          <div>
                            <span className="font-semibold text-gray-900">Vị trí: </span>
                            <span className="text-gray-700">{todayAttendance.location}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-gray-900">Check-out: </span>
                          {todayAttendance.check_out ? (
                            <span className="text-gray-700">
                              {todayAttendance.check_out}
                            </span>
                          ) : (
                            <span className="text-orange-600">Chưa check-out</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 text-sm">Chưa có thông tin check-in hôm nay</div>
                    )}
                  </div>
                )}
              </div>

              {/* Attendance Component */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-1 rounded-full bg-purple-500" />
                      <h2 className="text-xl font-bold text-gray-900">Điểm danh</h2>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Thực hiện check-in/check-out hàng ngày
                    </p>
                  </div>
                </div>
                <Attendance />
              </div>
            </div>
          )}

          {/* Files Section */}
          {activeSection === "section-files" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm w-full max-w-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-1 rounded-full bg-cyan-500" />
                    <h2 className="text-xl font-bold text-gray-900">Tài liệu được chia sẻ</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Danh sách tài liệu được quản lý chia sẻ
                  </p>
                </div>
              </div>

              {loadingFiles ? (
                <p className="text-sm text-gray-500">Đang tải danh sách tài liệu...</p>
              ) : visibleFiles.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có tài liệu nào.</p>
              ) : (
                <div className="space-y-3">
                  {visibleFiles.map((file) => (
                    <div
                      key={file.id}
                      className="rounded-lg border border-gray-200 p-4 flex justify-between items-start hover:bg-gray-50 transition"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {file.audience === "all" ? "Tất cả" : file.audience === "single" ? "Cá nhân" : "Staff"}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-800">{file.name}</p>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => handleFileClick(file, "view")}
                          onContextMenu={() => handleFileClick(file, "download")}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <Link2 className="h-4 w-4" />
                          {file.url}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Section */}
          {activeSection === "section-profile" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-1 rounded-full bg-emerald-500" />
                    <h2 className="text-xl font-bold text-gray-900">Thông tin cá nhân</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Xem và quản lý thông tin tài khoản của bạn</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="text-sm font-semibold text-gray-600">Họ và tên</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {currentUser?.full_name || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="text-sm font-semibold text-gray-600">Email</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {currentUser?.email || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="text-sm font-semibold text-gray-600">Vai trò</label>
                    <p className="text-lg text-gray-900 mt-1 capitalize">
                      {currentUser?.role || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="text-sm font-semibold text-gray-600">Phòng ban</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {currentUser?.department || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="text-sm font-semibold text-gray-600">Chức vụ</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {currentUser?.position || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <label className="text-sm font-semibold text-gray-600">ID</label>
                    <p className="text-lg text-gray-900 mt-1">
                      {currentUser?.id || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
