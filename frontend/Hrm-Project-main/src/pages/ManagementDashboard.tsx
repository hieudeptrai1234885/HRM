import { useEffect, useMemo, useState } from "react";
import { getEmployeesApi } from "../api/employeeAPI";
import { getTodayAttendance } from "../api/attendanceAPI";
import { mockEmployees } from "../data/mockData";
import type { AuthUser } from "../types/auth.ts";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Link2,
  Camera,
  ClipboardList,
  FolderKanban,
  ScanFace,
  Users,
  User,
  LogOut,
} from "lucide-react";
import FaceAttendanceModal from "../components/FaceAttendanceModal";
import { useNavigate } from "react-router-dom";
import {
  createSharedFile,
  getAllSharedFiles,
  deleteSharedFile,
  type SharedFile as APISharedFile,
} from "../api/sharedFileAPI";

type TaskType = "Critical" | "Urgent" | "Routine" | "General";

interface ManagerTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  assigned_to: string; // email or id (legacy)
  assigned_to_id?: string;
  assigned_to_email?: string;
  assignee_name: string;
  start_time: string;
  end_time: string;
}

interface SharedFile {
  id: number | string; // Support both API (number) and legacy (string)
  name: string;
  url: string;
  audience: "staff" | "all" | "single";
  assigned_to_email?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  file_type?: string;
  file_size?: number;
  created_by?: number;
  created_at?: string;
}

const TASK_STORAGE_KEY = "managerTasks";
const FILE_STORAGE_KEY = "sharedFiles";

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [tasks, setTasks] = useState<ManagerTask[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [newTask, setNewTask] = useState<Partial<ManagerTask>>({
    type: "Routine",
  });
  const [newFile, setNewFile] = useState<Partial<SharedFile>>({
    audience: "staff",
  });

  const [showFaceAttendance, setShowFaceAttendance] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-employees-status");
  const [todayAttendance, setTodayAttendance] = useState<{
    check_in: string | null;
    check_out: string | null;
    location?: string;
  } | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Load user + persisted data
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Parse currentUser error:", err);
      }
    }

    const savedTasks = localStorage.getItem(TASK_STORAGE_KEY);
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (err) {
        console.error("Parse tasks error:", err);
      }
    }
  }, []);

  // Load files from database
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoadingFiles(true);
        const data = await getAllSharedFiles();
        if (Array.isArray(data) && !(data as any).error) {
          // Convert API format to local format
          const convertedFiles: SharedFile[] = data.map((file: APISharedFile) => ({
            id: file.id,
            name: file.name,
            url: file.url,
            audience: file.audience,
            file_type: file.file_type,
            file_size: file.file_size,
            created_by: file.created_by,
            created_at: file.created_at,
          }));
          setFiles(convertedFiles);
        }
      } catch (err) {
        console.error("Load files error:", err);
        // Fallback to localStorage if API fails
        const savedFiles = localStorage.getItem(FILE_STORAGE_KEY);
        if (savedFiles) {
          try {
            setFiles(JSON.parse(savedFiles));
          } catch (parseErr) {
            console.error("Parse files error:", parseErr);
          }
        }
      } finally {
        setLoadingFiles(false);
      }
    };
    loadFiles();
  }, []);

  // Load employees
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingEmployees(true);
        const data = await getEmployeesApi();
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data);
        } else {
          setEmployees(mockEmployees);
        }
      } catch (err) {
        console.error("Load employees error:", err);
        setEmployees(mockEmployees);
      } finally {
        setLoadingEmployees(false);
      }
    };
    load();
  }, []);

  // Load today attendance
  useEffect(() => {
    const loadAttendance = async () => {
      if (!currentUser?.id) return;
      try {
        setLoadingAttendance(true);
        const data = await getTodayAttendance(currentUser.id);
        setTodayAttendance(data);
      } catch (err) {
        console.error("Load attendance error:", err);
        setTodayAttendance(null);
      } finally {
        setLoadingAttendance(false);
      }
    };
    loadAttendance();
  }, [currentUser?.id]);

  const saveTasks = (next: ManagerTask[]) => {
    setTasks(next);
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(next));
  };

  // Removed saveFiles - files are now managed via API

  const handleAddTask = () => {
    if (!newTask.title || !newTask.assigned_to || !newTask.start_time || !newTask.end_time) return;

    const assignee = employees.find((e) => {
      const idMatch = e.id?.toString() === newTask.assigned_to;
      const emailMatch = e.email === newTask.assigned_to;
      return idMatch || emailMatch;
    });

    const assigneeKey = assignee?.email || newTask.assigned_to!;
    const task: ManagerTask = {
      id: crypto.randomUUID(),
      title: newTask.title,
      description: newTask.description || "",
      type: (newTask.type as TaskType) || "Routine",
      // Ưu tiên lưu theo email để staff khớp chắc chắn
      assigned_to: assigneeKey,
      assigned_to_email: assignee?.email || undefined,
      assigned_to_id: assignee?.id?.toString(),
      assignee_name: assignee?.full_name || "Staff",
      start_time: newTask.start_time!,
      end_time: newTask.end_time!,
    };

    const next = [...tasks, task];
    saveTasks(next);
    setNewTask({ type: newTask.type || "Routine" });
  };

  const handleDeleteTask = (id: string) => {
    saveTasks(tasks.filter((t) => t.id !== id));
  };

  const handleAddFile = async () => {
    // Validation
    if (!newFile.name || !newFile.name.trim()) {
      console.warn("Vui lòng nhập tên file/tài liệu");
      return;
    }
    
    if (!newFile.url || !newFile.url.trim()) {
      console.warn("Vui lòng nhập đường dẫn file");
      return;
    }

    if (!currentUser?.id) {
      console.error("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", currentUser);
      return;
    }

    // Đảm bảo created_by là number
    const createdById = typeof currentUser.id === "string" ? parseInt(currentUser.id) : currentUser.id;
    if (isNaN(createdById) || createdById <= 0) {
      console.error("ID người dùng không hợp lệ:", currentUser.id);
      return;
    }

    try {
      setLoadingFiles(true);
      
      const emp = newFile.audience === "single" && newFile.assigned_to_email
        ? employees.find(
            (e) =>
              e.email === newFile.assigned_to_email ||
              e.id?.toString() === newFile.assigned_to_email ||
              e.id?.toString() === newFile.assigned_to_id
          )
        : null;

      const fileData = {
        name: newFile.name.trim(),
        url: newFile.url.trim(),
        file_type: newFile.file_type,
        file_size: newFile.file_size,
        audience: (newFile.audience as "all" | "staff" | "single") || "staff",
        assigned_to_email: emp?.email || newFile.assigned_to_email,
        assigned_to_id: emp?.id?.toString() || newFile.assigned_to_id,
        created_by: createdById, // Đảm bảo là number
      };

      console.log("📤 Đang gửi request tạo file:", fileData);
      console.log("👤 Current User:", { id: currentUser.id, email: currentUser.email, role: currentUser.role });

      const result = await createSharedFile(fileData);

      console.log("📥 Response từ server:", result);

      if (result.error) {
        console.error("❌ Lỗi tạo file:", result);
        console.error(`Không thể tạo file:\n${result.error}\n\nVui lòng kiểm tra:\n- Đã đăng nhập chưa?\n- Backend có đang chạy không?\n- Database đã được tạo chưa?\n- User ID có tồn tại trong bảng employees không?`);
        return;
      }

      if (!result.success && !result.file_id) {
        console.error("⚠️ Kết quả không hợp lệ:", result);
        console.error("Không thể tạo file. Phản hồi từ server không hợp lệ.\n\nResponse: " + JSON.stringify(result));
        return;
      }

      console.log("✅ File đã được tạo thành công với ID:", result.file_id);

      // Reload files from database
      const updatedFiles = await getAllSharedFiles();
      if (Array.isArray(updatedFiles) && !(updatedFiles as any).error) {
        const convertedFiles: SharedFile[] = updatedFiles.map((file: APISharedFile) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          audience: file.audience,
          file_type: file.file_type,
          file_size: file.file_size,
          created_by: file.created_by,
          created_at: file.created_at,
        }));
        setFiles(convertedFiles);
        console.log("✅ Đã reload danh sách file, tổng số:", convertedFiles.length);
      } else {
        console.warn("⚠️ Không thể reload danh sách file:", updatedFiles);
      }

      // Reset form
      setNewFile({ audience: "staff" });
      console.log("✅ Tạo file thành công!");
    } catch (error) {
      console.error("❌ Lỗi tạo file (catch):", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Lỗi không mong đợi:\n${errorMessage}\n\nVui lòng kiểm tra console để biết thêm chi tiết.`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDeleteFile = async (id: number | string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa file này?")) return;

    try {
      setLoadingFiles(true);
      const fileId = typeof id === "string" ? parseInt(id) : id;
      const result = await deleteSharedFile(fileId);

      if (result.error) {
        console.error("Lỗi xóa file:", result.error);
        return;
      }

      // Reload files from database
      const updatedFiles = await getAllSharedFiles();
      if (Array.isArray(updatedFiles) && !(updatedFiles as any).error) {
        const convertedFiles: SharedFile[] = updatedFiles.map((file: APISharedFile) => ({
          id: file.id,
          name: file.name,
          url: file.url,
          audience: file.audience,
          file_type: file.file_type,
          file_size: file.file_size,
          created_by: file.created_by,
          created_at: file.created_at,
        }));
        setFiles(convertedFiles);
      }
    } catch (error) {
      console.error("Lỗi xóa file:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFaceAttendanceSuccess = async (data: {
    name: string;
    time: string;
    type?: "checkin" | "checkout";
    location?: string;
  }) => {
    console.log("✅ Check-in thành công:", data);
    setShowFaceAttendance(false);
    // Reload attendance sau khi check-in/check-out
    if (currentUser?.id) {
      try {
        const attendanceData = await getTodayAttendance(currentUser.id);
        setTodayAttendance({ ...attendanceData, location: data.location });
      } catch (err) {
        console.error("Reload attendance error:", err);
      }
    }
  };

  // Tính toán xem có muộn không
  const isLate = (checkInTime: string | null, workStartTime: string = "08:00") => {
    if (!checkInTime) return false;
    const [checkHour, checkMin] = checkInTime.split(":").map(Number);
    const [workHour, workMin] = workStartTime.split(":").map(Number);
    const checkMinutes = checkHour * 60 + checkMin;
    const workMinutes = workHour * 60 + workMin;
    return checkMinutes > workMinutes;
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("pendingUser");
    localStorage.removeItem("userEmail");
    navigate("/", { replace: true });
  };

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [tasks]
  );

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const totalTasks = tasks.length;
    const totalFiles = files.length;
    return { totalEmployees, totalTasks, totalFiles };
  }, [employees.length, tasks.length, files.length]);

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

  const menuItems = [
    { id: "section-employees-status", label: "Employees Status", icon: ClipboardList, color: "text-indigo-600", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
    { id: "section-files", label: "Chia sẻ file", icon: FolderKanban, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
    { id: "section-face", label: "Điểm danh khuôn mặt", icon: ScanFace, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
    { id: "section-staff-info", label: "Thông tin staff", icon: Users, color: "text-sky-600", bgColor: "bg-sky-50", borderColor: "border-sky-200" },
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
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white rounded-2xl p-6 shadow-lg">
            <div>
              <p className="text-sm text-indigo-100">Xin chào</p>
              <h1 className="text-3xl font-bold">
                {currentUser?.full_name || currentUser?.email || "Management"}
              </h1>
              <p className="text-sm text-indigo-100">
                Vai trò: {currentUser?.role || "manager"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm bg-white/15 border border-white/20 rounded-lg px-4 py-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>Quản lý công việc & tài liệu cho nhân viên</span>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <p className="text-sm text-gray-500">Tổng nhân viên</p>
              <p className="text-2xl font-bold text-indigo-700">{stats.totalEmployees}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <p className="text-sm text-gray-500">Công việc đã giao</p>
              <p className="text-2xl font-bold text-blue-700">{stats.totalTasks}</p>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-white p-5 shadow-sm hover:shadow-md transition">
              <p className="text-sm text-gray-500">Tài liệu chia sẻ</p>
              <p className="text-2xl font-bold text-cyan-700">{stats.totalFiles}</p>
            </div>
          </div>

      {/* Employees Status Section */}
      {activeSection === "section-employees-status" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6 shadow-sm w-full max-w-full overflow-x-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-1 rounded-full bg-indigo-500" />
                <h2 className="text-xl font-bold text-gray-900">Employees Status</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Nhập nhiệm vụ cho nhân viên</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Tiêu đề</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={newTask.title || ""}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="VD: Chuẩn bị báo cáo tuần"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Loại</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={newTask.type || "Routine"}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}
              >
                <option>Critical</option>
                <option>Urgent</option>
                <option>Routine</option>
                <option>General</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Giao cho</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={newTask.assigned_to || ""}
                onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                disabled={loadingEmployees}
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map((emp) => (
                  <option key={emp.id || emp.email} value={emp.email || emp.id}>
                    {emp.full_name || emp.email} ({emp.department || "N/A"}) - {emp.email || emp.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Thời gian</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  className="rounded border border-gray-300 px-3 py-2"
                  value={newTask.start_time || ""}
                  onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })}
                />
                <input
                  type="datetime-local"
                  className="rounded border border-gray-300 px-3 py-2"
                  value={newTask.end_time || ""}
                  onChange={(e) => setNewTask({ ...newTask, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-4 space-y-2">
              <label className="text-sm text-gray-600">Mô tả</label>
              <textarea
                className="w-full rounded border border-gray-300 px-3 py-2"
                rows={3}
                value={newTask.description || ""}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={handleAddTask}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 shadow"
          >
            <Plus className="h-4 w-4" /> Giao việc
          </button>

          {/* Danh sách công việc đã giao */}
          <div className="pt-6 border-t border-gray-200 w-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Danh sách công việc đã giao</h3>
            {sortedTasks.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có công việc nào.</p>
            ) : (
              <div className="space-y-3 w-full">
                {sortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex justify-between items-start hover:bg-gray-100 transition w-full"
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
                        Giao cho: {task.assignee_name} (ID/email: {task.assigned_to})
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-red-500 hover:text-red-600 ml-4 flex-shrink-0"
                      aria-label="Xóa task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File sharing side by side */}
      {activeSection === "section-files" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-6 w-1 rounded-full bg-cyan-500" />
              <h2 className="text-xl font-bold text-gray-900">Chia sẻ file cho nhân viên</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Staff sẽ xem trong trang riêng, có thể chia sẻ cho cá nhân
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <div className="space-y-4 rounded-xl border border-gray-100 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-gray-600">Tên file/ tài liệu</label>
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  value={newFile.name || ""}
                  onChange={(e) => setNewFile({ ...newFile, name: e.target.value })}
                  placeholder="VD: Quy trình nghỉ phép"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Mức truy cập</label>
                <select
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  value={newFile.audience || "staff"}
                  onChange={(e) =>
                    setNewFile({ ...newFile, audience: e.target.value as SharedFile["audience"] })
                  }
                >
                  <option value="staff">Staff (tất cả nhân viên)</option>
                  <option value="all">Tất cả</option>
                  <option value="single">Cá nhân</option>
                </select>
              </div>
            </div>

            {newFile.audience === "single" && (
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Chia sẻ cho</label>
                <select
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  value={newFile.assigned_to_email || ""}
                  onChange={(e) => setNewFile({ ...newFile, assigned_to_email: e.target.value })}
                  disabled={loadingEmployees}
                >
                  <option value="">-- Chọn nhân viên --</option>
                  {employees.map((emp) => (
                    <option key={emp.id || emp.email} value={emp.email || emp.id}>
                      {emp.full_name || emp.email} ({emp.department || "N/A"}) - {emp.email || emp.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-gray-600">Link tài liệu</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2"
                value={newFile.url || ""}
                onChange={(e) => setNewFile({ ...newFile, url: e.target.value })}
                placeholder="https://drive... hoặc đường dẫn nội bộ"
              />
            </div>

            <button
              onClick={handleAddFile}
              disabled={loadingFiles}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" /> {loadingFiles ? "Đang thêm..." : "Thêm file"}
            </button>
          </div>

          {/* List */}
          <div className="space-y-3 rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-800">File đã chia sẻ</h3>
              <span className="text-xs text-gray-500">{files.length} file</span>
            </div>
            {loadingFiles ? (
              <p className="text-sm text-gray-500">Đang tải danh sách file...</p>
            ) : files.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có file nào.</p>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-lg border border-gray-200 p-4 flex justify-between items-start"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          {file.audience === "all"
                            ? "Tất cả"
                            : file.audience === "single"
                            ? "Cá nhân"
                            : "Staff"}
                        </span>
                        {file.assigned_to_name && (
                          <span className="text-xs text-gray-500">• {file.assigned_to_name}</span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-800">{file.name}</p>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <Link2 className="h-4 w-4" />
                        {file.url}
                      </a>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-500 hover:text-red-600"
                      aria-label="Xóa file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Face Attendance */}
      {activeSection === "section-face" && (
        <div className="space-y-4">
          {/* Thông tin ca làm hôm nay */}
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

          {/* Nút mở camera */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-6 w-1 rounded-full bg-purple-500" />
                  <h2 className="text-xl font-bold text-gray-900">Điểm danh bằng khuôn mặt</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Quản lý có thể check-in/check-out bằng nhận diện khuôn mặt
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-200">
              <button
                onClick={() => setShowFaceAttendance(true)}
                className="inline-flex items-center gap-3 rounded-lg bg-purple-600 px-6 py-3 text-white hover:bg-purple-700 shadow-lg transition"
              >
                <Camera className="h-5 w-5" />
                <span className="font-semibold">Mở camera điểm danh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Info */}
      {activeSection === "section-staff-info" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-1 rounded-full bg-sky-500" />
                <h2 className="text-xl font-bold text-gray-900">Danh sách Staff</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Danh sách nhân viên với role "staff" - bộ phận và chức danh
              </p>
            </div>
          </div>

          {loadingEmployees ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500 mt-4">Đang tải danh sách nhân viên...</p>
            </div>
          ) : (() => {
            const staffList = employees.filter((emp) => 
              (emp.role || "").toLowerCase() === "staff"
            );
            
            if (staffList.length === 0) {
              return (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Chưa có nhân viên nào có role "staff".</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {staffList.map((emp) => (
                  <div
                    key={emp.id || emp.email}
                    className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {emp.avatar_url ? (
                          <img
                            src={emp.avatar_url}
                            alt={emp.full_name || emp.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              {(emp.full_name || emp.name || emp.email || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {emp.full_name || emp.name || emp.email}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">{emp.email || "Không có email"}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                          {emp.department || "Chưa có phòng ban"}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">
                          {emp.position || "Chưa có chức danh"}
                        </span>
                      </div>
                      
                      {emp.phone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">Điện thoại:</span>
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      
                      {emp.start_date && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">Ngày bắt đầu:</span>
                          <span>{new Date(emp.start_date).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
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

          {showFaceAttendance && (
            <FaceAttendanceModal
              onClose={() => setShowFaceAttendance(false)}
              onSuccess={handleFaceAttendanceSuccess}
              defaultType="checkin"
            />
          )}
        </div>
      </div>
    </div>
  );
}
