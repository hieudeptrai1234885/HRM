import { Search, Calendar as CalendarIcon, Plus, Bell } from 'lucide-react';

interface HeaderProps {
  userName: string;
  activeTab: string;
  onLogout?: () => void;

  // THÊM PROPS MỚI
  onOpenAddEmployee?: () => void;
}

export default function Header({ userName, activeTab, onLogout, onOpenAddEmployee }: HeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'dashboard': return ['Home'];
      case 'employees': return ['Home', 'Dashboard', 'Employees'];
      case 'attendances': return ['Home', 'Dashboard', 'Attendances'];
      case 'calendar': return ['Home', 'Dashboard', 'Calendar'];
      case 'leaves': return ['Home', 'Dashboard', 'Leaves'];
      case 'payroll': return ['Home', 'Dashboard', 'Payroll'];
      case 'documents': return ['Home', 'Dashboard', 'Documents'];
      default: return ['Home'];
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 z-10">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          
          {/* GREETING */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {getGreeting()}, <span className="text-blue-600">{userName}!</span>
            </h1>

            <div className="flex items-center space-x-2 mt-1 text-sm text-gray-500">
              {getBreadcrumb().map((item, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Attendance</span>
            </button>

            {/* NÚT MỞ MODAL ADD EMPLOYEE */}
            <button
              onClick={onOpenAddEmployee}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-medium">Add Employee</span>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
