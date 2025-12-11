import { useState, useEffect } from 'react';
import FaceAttendance from './FaceAttendance';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import {
  Calendar as CalendarIcon,
  MoreVertical,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Attendances from './Attendance';
import CalendarPage from './Calendar';
import Documents from './Documents';
import Employees from './Employees';
import Leaves from './Leaves';
import Payroll from './Payroll';
import SettingsPage from './Settings';
import AddEmployeeModal from "../components/AddEmployeeModal";



import type { MockUser } from '../lib/mockAuth';



import {
  mockEmployees,
  mockSchedules,
} from '../data/mockData';
import { getEmployeesApi, getEmployeeStatsApi } from '../api/employeeAPI';
import type { Employee, ScheduleItem } from '../types';

const DASHBOARD_TABS = [
  'dashboard',
  'employees',
  'attendances',
  'calendar',
  'leaves',
  'payroll',
  'documents',
  'settings',
  'face-attendance',
] as const;

type DashboardTab = (typeof DASHBOARD_TABS)[number];

interface DashboardProps {
  session?: Session | null;
  authLoading?: boolean;
  onLogout?: () => void;
  onRequireVerification?: () => void;
  authMode?: 'supabase' | 'mock';
  mockUser?: MockUser | null;
}


const isDashboardTab = (value: string): value is DashboardTab =>
  (DASHBOARD_TABS as readonly string[]).includes(value);

export  default function Dashboard({ session, mockUser, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
    // ❗ STATE MỞ / ĐÓNG MODAL ADD EMPLOYEE
  const [openAddModal, setOpenAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Key để trigger refresh dashboard

  const displayName =
    mockUser?.fullName ||
    mockUser?.email ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email ||
    'Team';

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("pendingUser");
    localStorage.removeItem("userEmail");
    if (onLogout) {
      onLogout();
    } else {
      navigate("/", { replace: true });
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'employees':
        return <Employees />;
      case 'face-attendance':
  return <FaceAttendance />;
 
      case 'attendances':
        return <Attendances />;
      case 'calendar':
        return <CalendarPage />;
      case 'leaves':
        return <Leaves />;
      case 'payroll':
        return <Payroll />;
      case 'documents':
        return <Documents />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardOverview refreshKey={refreshKey} />;
    }
  };

  const handleSelectTab = (tab: string) => {
    if (isDashboardTab(tab)) {
      setActiveTab(tab);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={handleSelectTab} />
      <div className="ml-64 flex min-h-screen flex-1 flex-col bg-gray-50">
        <Header
  userName={displayName}
  activeTab={activeTab}
  onLogout={handleLogout}
  onOpenAddEmployee={() => setOpenAddModal(true)}
/>

        {openAddModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
    <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-xl relative">
      <button
        onClick={() => setOpenAddModal(false)}
        className="absolute right-4 top-4 text-gray-600 hover:text-gray-800 text-xl"
      >
        ✕
      </button>

      <AddEmployeeModal 
        onClose={() => {
          setOpenAddModal(false);
          // Refresh dashboard sau khi thêm employee
          setRefreshKey(prev => prev + 1);
        }} 
      />
    </div>
  </div>
)}

        <main className="flex-1 p-8">{renderActiveTab()}</main>
      </div>
    </div>
  );
}

function DashboardOverview({ refreshKey }: { refreshKey?: number }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load employees từ database
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);
        setStatsLoading(true);

        const [employeeRes, statsRes] = await Promise.all([
          getEmployeesApi(),
          getEmployeeStatsApi(),
        ]);

        if (!employeeRes?.error) {
          setEmployees(employeeRes || []);
        } else {
          setEmployees(mockEmployees);
        }

        if (!statsRes?.error) {
          setStats(statsRes);
        } else {
          setStats(null);
        }
      } catch (error) {
        console.error("Lỗi load employees:", error);
        // Fallback về mock data nếu có lỗi
        setEmployees(mockEmployees);
        setStats(null);
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    };

    loadEmployees();
  }, [refreshKey]); // Reload khi refreshKey thay đổi

  // Tính toán các số liệu từ dữ liệu thật
  const totalEmployees = stats?.totalEmployees ?? employees.length;
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const newEmployees = stats?.joinedLast30Days ?? employees.filter((employee) => {
    if (!employee.start_date) return false;
    const joinDate = new Date(employee.start_date);
    return joinDate > monthAgo;
  }).length;

  // Design Employee = số nhân viên có department là "Design" hoặc tương tự
  // Nếu không có field status, ta có thể dùng department hoặc role
  const designEmployees = stats?.designEmployees ?? employees.filter((employee) => 
    employee.department?.toLowerCase().includes('design') || 
    employee.position?.toLowerCase().includes('design')
  ).length;

  const onLeaveToday = stats?.onLeaveEmployees ?? employees.filter((employee) => 
    employee.status?.toLowerCase().includes('leave')
  ).length;
  const newJustifications = stats?.newJustifications ?? 0;
  const isCardLoading = loading || statsLoading;
  const departmentBreakdown =
    stats?.departmentBreakdown ??
    employees.reduce((acc: any[], emp) => {
      const dept = (emp.department || 'Unknown').trim() || 'Unknown';
      const existing = acc.find((d) => d.department === dept);
      if (existing) {
        existing.total += 1;
      } else {
        acc.push({ department: dept, total: 1 });
      }
      return acc;
    }, []);

  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Inactive':
        return 'bg-red-100 text-red-700';
      case 'Onboarding':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getScheduleTypeColor = (type: ScheduleItem['type']) => {
    switch (type) {
      case 'Critical':
        return 'bg-red-100 text-red-700';
      case 'Urgent':
        return 'bg-amber-100 text-amber-700';
      case 'Routine':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const employeeChartData = [
    { day: 'Mon', value: 85 },
    { day: 'Tue', value: 92 },
    { day: 'Wed', value: 95 },
    { day: 'Thu', value: 88 },
    { day: 'Fri', value: 90 },
    { day: 'Sat', value: 78 },
    { day: 'Sun', value: 82 },
  ];

  const maxValue = Math.max(...employeeChartData.map((dataPoint) => dataPoint.value), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-amber-100 p-3">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <span className="flex items-center text-sm font-semibold text-green-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              +10%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">
              {isCardLoading ? '...' : totalEmployees.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-gray-500">Total Employees</p>
            <p className="text-xs text-gray-400">
              {isCardLoading ? '...' : `${newEmployees} joined this month`}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-blue-100 p-3">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
            <span className="flex items-center text-sm font-semibold text-green-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              +23%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">
              {isCardLoading ? '...' : designEmployees}
            </p>
            <p className="mt-1 text-sm text-gray-500">Design Employee</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-pink-100 p-3">
              <CalendarIcon className="h-6 w-6 text-pink-600" />
            </div>
            <span className="flex items-center text-sm font-semibold text-green-600">
              <TrendingUp className="mr-1 h-4 w-4" />
              +18%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">
              {isCardLoading ? '...' : onLeaveToday}
            </p>
            <p className="mt-1 text-sm text-gray-500">Employee on Leave</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-lg bg-purple-100 p-3">
              <UserX className="h-6 w-6 text-purple-600" />
            </div>
            <span className="flex items-center text-sm font-semibold text-red-600">
              <TrendingDown className="mr-1 h-4 w-4" />
              -30%
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-800">
              {isCardLoading ? '...' : newJustifications}
            </p>
            <p className="mt-1 text-sm text-gray-500">New Justification</p>
          </div>
        </div>
      </div>

      {/* Department breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Department Breakdown</h2>
          {statsLoading && <span className="text-sm text-gray-500">Đang tải...</span>}
        </div>
        {departmentBreakdown.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có dữ liệu phòng ban</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {departmentBreakdown.map((dept: any) => (
              <div
                key={dept.department}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <p className="text-sm text-gray-500">{dept.department}</p>
                <p className="text-2xl font-bold text-gray-800">
                  {statsLoading ? '...' : dept.total}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Employee Tracker</h2>
              <div className="mt-2 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="text-sm text-gray-600">Employee</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-blue-400" />
                  <span className="text-sm text-gray-600">Intern</span>
                </div>
              </div>
            </div>
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
              This week
            </button>
          </div>

          <div className="flex h-64 items-end justify-between space-x-2">
            {employeeChartData.map((item) => (
              <div key={item.day} className="flex flex-1 flex-col items-center">
                <div className="mb-2 flex h-[200px] w-full flex-col items-center justify-end space-y-1">
                  <div
                    className="w-full rounded-t-lg bg-amber-400"
                    style={{ height: `${(item.value / maxValue) * 100}%` }}
                  />
                  <div
                    className="w-full rounded-t-lg bg-blue-400"
                    style={{ height: `${(item.value / maxValue) * 90}%` }}
                  />
                </div>
                <span className="mt-2 text-xs text-gray-500">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Upcoming Schedule</h2>
            <button className="flex items-center space-x-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
              <span>Today</span>
              <CalendarIcon className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-4">
            {mockSchedules.map((schedule) => {
              const employee = employees.find((item) => item.id === schedule.assigned_to) || 
                               mockEmployees.find((item) => item.id === schedule.assigned_to);
              return (
                <div key={schedule.id} className="border-l-4 border-gray-200 pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${getScheduleTypeColor(schedule.type)}`}
                        >
                          {schedule.type}
                        </span>
                      </div>
                      <h3 className="mt-2 font-semibold text-gray-800">{schedule.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{schedule.description}</p>
                      {employee && (
                        <div className="mt-2 flex items-center space-x-2">
                          {employee.avatar || employee.avatar_url ? (
                            <img
                              src={employee.avatar || employee.avatar_url}
                              alt={employee.full_name}
                              className="h-6 w-6 rounded-full"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                              {employee.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="text-xs text-gray-600">{employee.full_name}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                        <CalendarIcon className="h-3 w-3" />
                        <span>
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-400 transition hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Employees Status</h2>
            <button className="text-gray-400 transition hover:text-gray-600">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Full Name & Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Join Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                      Chưa có nhân viên
                    </td>
                  </tr>
                ) : (
                  employees.slice(0, 7).map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 transition hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {employee.avatar ? (
                            <img
                              src={employee.avatar}
                              alt={employee.full_name}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                              {employee.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800">{employee.full_name}</p>
                            <p className="text-sm text-gray-500">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{employee.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {employee.start_date 
                          ? new Date(employee.start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            employee.status ? getStatusColor(employee.status as Employee['status']) : 'bg-green-100 text-green-700'
                          }`}
                        >
                          • {employee.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-gray-400 transition hover:text-gray-600">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
