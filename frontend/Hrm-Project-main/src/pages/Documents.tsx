import { FolderOpen, File, MoreVertical, Check, AlertTriangle, Shield, User, Share2 } from 'lucide-react';
import { mockDocuments, mockEmployees } from '../data/mockData';
import { useEffect, useState } from 'react';
import { getSuspiciousActivities } from '../api/documentAccessAPI';
import { getAllSharedFiles, getFilePermissions, type SharedFile } from '../api/sharedFileAPI';

interface SuspiciousActivity {
  employee_id: number;
  full_name: string;
  email: string;
  department: string;
  file_count: number;
  download_count: number;
  hour_period: string;
  first_access: string;
  last_access: string;
  accessed_files: string;
  suspicious_type: 'high_access_rate' | 'high_download_rate' | 'unusual_hours' | 'normal';
}

interface FileWithAccessInfo extends SharedFile {
  created_by_name?: string;
  created_by_email?: string;
  permission_count?: number;
  accessible_employees?: Array<{
    id: number;
    full_name: string;
    email: string;
    department: string;
    permission_type: string;
  }>;
}

export default function Documents() {
  const uploadProgress = 100;
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [loadingSuspicious, setLoadingSuspicious] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<FileWithAccessInfo[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    const loadSuspiciousActivities = async () => {
      try {
        setLoadingSuspicious(true);
        const data = await getSuspiciousActivities(7);
        if (Array.isArray(data)) {
          setSuspiciousActivities(data);
        }
      } catch (error) {
        console.error("Lỗi load hoạt động bất thường:", error);
      } finally {
        setLoadingSuspicious(false);
      }
    };
    loadSuspiciousActivities();
  }, []);

  // Load shared files từ database
  useEffect(() => {
    const loadSharedFiles = async () => {
      try {
        setLoadingFiles(true);
        const files = await getAllSharedFiles();
        if (Array.isArray(files) && !files.error) {
          // Load permissions cho từng file
          const filesWithPermissions = await Promise.all(
            files.map(async (file: SharedFile) => {
              try {
                const permissions = await getFilePermissions(file.id);
                return {
                  ...file,
                  accessible_employees: Array.isArray(permissions) ? permissions : [],
                };
              } catch (err) {
                console.error(`Lỗi load permissions cho file ${file.id}:`, err);
                return {
                  ...file,
                  accessible_employees: [],
                };
              }
            })
          );
          setSharedFiles(filesWithPermissions);
        }
      } catch (error) {
        console.error("Lỗi load shared files:", error);
      } finally {
        setLoadingFiles(false);
      }
    };
    loadSharedFiles();
  }, []);


  const getSuspiciousTypeLabel = (type: string) => {
    switch (type) {
      case 'high_access_rate':
        return 'Truy cập quá nhiều file';
      case 'high_download_rate':
        return 'Tải về quá nhiều file';
      case 'unusual_hours':
        return 'Truy cập vào giờ bất thường';
      default:
        return 'Hoạt động bất thường';
    }
  };

  const getSuspiciousTypeColor = (type: string) => {
    switch (type) {
      case 'high_access_rate':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high_download_rate':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'unusual_hours':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getStorageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    if (percentage >= 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const teams = [
    { name: 'Product Design Team', size: 7.5, unit: 'MB', date: 'Sat, 25 Feb' },
    { name: 'Developer Team', size: 430, unit: 'MB', date: 'Sat, 25 Feb' },
    { name: 'Finance Team', size: 2.5, unit: 'GB', date: 'Sat, 25 Feb' },
    { name: 'Finance Team', size: 2.5, unit: 'GB', date: 'Sat, 25 Feb' }
  ];


  return (
    <div className="space-y-6">
      {/* Cảnh báo hoạt động bất thường */}
      {suspiciousActivities.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-red-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Cảnh báo hoạt động bất thường</h2>
            <span className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
              {suspiciousActivities.length} cảnh báo
            </span>
          </div>
          <div className="space-y-3">
            {suspiciousActivities.map((activity, index) => (
              <div
                key={index}
                className={`rounded-lg border p-4 ${getSuspiciousTypeColor(activity.suspicious_type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" />
                      <span className="font-semibold">{activity.full_name}</span>
                      <span className="text-sm opacity-75">({activity.email})</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/50">
                        {activity.department}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="font-medium">Loại cảnh báo: </span>
                        {getSuspiciousTypeLabel(activity.suspicious_type)}
                      </div>
                      <div>
                        <span className="font-medium">Số file truy cập: </span>
                        {activity.file_count} file
                      </div>
                      {activity.download_count > 0 && (
                        <div>
                          <span className="font-medium">Số file tải về: </span>
                          {activity.download_count} file
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Thời gian: </span>
                        {new Date(activity.first_access).toLocaleString('vi-VN')} - {new Date(activity.last_access).toLocaleString('vi-VN')}
                      </div>
                      {activity.accessed_files && (
                        <div className="mt-2">
                          <span className="font-medium">File đã truy cập: </span>
                          <span className="text-xs">{activity.accessed_files}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
          {teams.map((team, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  index === 0 ? 'bg-amber-100' :
                  index === 1 ? 'bg-green-100' :
                  index === 2 ? 'bg-blue-100' :
                  'bg-purple-100'
                }`}>
                  <FolderOpen className={`w-6 h-6 ${
                    index === 0 ? 'text-amber-600' :
                    index === 1 ? 'text-green-600' :
                    index === 2 ? 'text-blue-600' :
                    'text-purple-600'
                  }`} />
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{team.name}</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-gray-800">{team.size} {team.unit}</span>
                <span className="text-sm text-gray-500">{team.date}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Upload Documents</h3>
            <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
              Today
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6 hover:border-blue-500 transition-colors cursor-pointer">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <File className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Drag an image here</p>
            <p className="text-xs text-gray-500 mb-4">or</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Choose File
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <File className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-800">General Documents.txt</span>
              </div>
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Upload template</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="text-xs font-semibold text-blue-600">{uploadProgress}%</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold">G</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800">Google Drive</p>
                <p className="text-sm text-gray-500">Use Google Drive to storage your account data and document</p>
              </div>
              <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50">
                Connected
              </button>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">My Drive</p>
              <p className="text-xs text-gray-500 mb-4">
                Use Google Drive to storage your account data and document
              </p>
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Click here to lear more
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Chi tiết file được chia sẻ */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Chi tiết file được chia sẻ</h2>
          </div>
          {loadingFiles && (
            <span className="text-sm text-gray-500">Đang tải...</span>
          )}
        </div>

        {loadingFiles ? (
          <div className="text-center py-8 text-gray-500">
            Đang tải danh sách file...
          </div>
        ) : sharedFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Chưa có file nào được chia sẻ
          </div>
        ) : (
          <div className="space-y-4">
            {sharedFiles.map((file) => (
              <div
                key={file.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <File className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-800">{file.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        file.audience === 'all' ? 'bg-green-100 text-green-700' :
                        file.audience === 'staff' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {file.audience === 'all' ? 'Tất cả' :
                         file.audience === 'staff' ? 'Chỉ Staff' :
                         'Cá nhân'}
                      </span>
                    </div>
                    
                    {/* Người chia sẻ */}
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Người chia sẻ:</span>
                      <span>{file.created_by_name || file.created_by_email || `ID: ${file.created_by}` || 'Không xác định'}</span>
                      {file.created_by_email && (
                        <span className="text-gray-400">({file.created_by_email})</span>
                      )}
                    </div>

                    {/* Người được quyền truy cập */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                        <Share2 className="w-4 h-4" />
                        <span>Người được quyền truy cập:</span>
                      </div>
                      {file.audience === 'all' ? (
                        <div className="ml-6 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded">Tất cả nhân viên</span>
                        </div>
                      ) : file.audience === 'staff' ? (
                        <div className="ml-6 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">Tất cả nhân viên có role "staff"</span>
                        </div>
                      ) : (
                        <div className="ml-6">
                          {file.accessible_employees && file.accessible_employees.length > 0 ? (
                            <div className="space-y-2">
                              {file.accessible_employees.map((emp: any) => (
                                <div
                                  key={emp.id || emp.employee_id}
                                  className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded"
                                >
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-xs">
                                      {emp.full_name?.charAt(0) || emp.email?.charAt(0) || '?'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <span className="font-medium text-gray-800">{emp.full_name || 'Không tên'}</span>
                                    <span className="text-gray-500 ml-2">({emp.email})</span>
                                    {emp.department && (
                                      <span className="text-gray-400 ml-2">- {emp.department}</span>
                                    )}
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    emp.permission_type === 'both' ? 'bg-green-100 text-green-700' :
                                    emp.permission_type === 'view' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {emp.permission_type === 'both' ? 'Xem & Tải' :
                                     emp.permission_type === 'view' ? 'Chỉ xem' :
                                     emp.permission_type === 'download' ? 'Chỉ tải' :
                                     'Không xác định'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Chưa có nhân viên nào được phân quyền cụ thể
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Thông tin file */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                      {file.created_at && (
                        <span>Ngày tạo: {new Date(file.created_at).toLocaleDateString('vi-VN')}</span>
                      )}
                      {file.file_size && (
                        <span>Kích thước: {formatFileSize(file.file_size)}</span>
                      )}
                      {file.file_type && (
                        <span>Loại: {file.file_type}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
