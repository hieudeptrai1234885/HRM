// API cho quản lý file được chia sẻ

export interface SharedFile {
  id: number;
  name: string;
  url: string;
  file_type?: string;
  file_size?: number;
  audience: "all" | "staff" | "single";
  created_by?: number;
  created_at?: string;
  permission_type?: "view" | "download" | "both";
  created_by_name?: string;
  created_by_email?: string;
  permission_count?: number;
}

export async function createSharedFile(data: {
  name: string;
  url: string;
  file_type?: string;
  file_size?: number;
  audience: "all" | "staff" | "single";
  assigned_to_email?: string;
  assigned_to_id?: string;
  created_by: number;
}) {
  try {
    const res = await fetch("http://localhost:5000/api/shared-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    const result = await res.json();
    
    // Kiểm tra HTTP status code
    if (!res.ok) {
      return { 
        error: result.error || `Lỗi ${res.status}: ${res.statusText}` 
      };
    }
    
    return result;
  } catch (error) {
    console.error("Lỗi tạo file:", error);
    return { error: `Không thể kết nối đến server: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export async function getAllSharedFiles() {
  try {
    const res = await fetch("http://localhost:5000/api/shared-files", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return res.json();
  } catch (error) {
    console.error("Lỗi lấy danh sách file:", error);
    return { error: "Không thể lấy danh sách file" };
  }
}

export async function getAccessibleFilesForEmployee(employee_id: number) {
  try {
    const url = `http://localhost:5000/api/shared-files/employee/${employee_id}`;
    console.log(`🌐 Gọi API: ${url}`);
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      console.error(`❌ API error ${res.status}:`, errorData);
      return { error: errorData.error || `Lỗi ${res.status}` };
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Lỗi lấy file có thể truy cập:", error);
    return { error: `Không thể kết nối đến server: ${error instanceof Error ? error.message : "Unknown error"}` };
  }
}

export async function deleteSharedFile(id: number) {
  try {
    const res = await fetch(`http://localhost:5000/api/shared-files/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return res.json();
  } catch (error) {
    console.error("Lỗi xóa file:", error);
    return { error: "Không thể xóa file" };
  }
}

export async function addFilePermission(data: {
  file_id: number;
  employee_id: number;
  permission_type?: "view" | "download" | "both";
  granted_by?: number;
}) {
  try {
    const res = await fetch("http://localhost:5000/api/shared-files/permission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  } catch (error) {
    console.error("Lỗi thêm quyền:", error);
    return { error: "Không thể thêm quyền" };
  }
}

export async function removeFilePermission(file_id: number, employee_id: number) {
  try {
    const res = await fetch(
      `http://localhost:5000/api/shared-files/permission/${file_id}/${employee_id}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.json();
  } catch (error) {
    console.error("Lỗi xóa quyền:", error);
    return { error: "Không thể xóa quyền" };
  }
}

export async function getFilePermissions(file_id: number) {
  try {
    const res = await fetch(
      `http://localhost:5000/api/shared-files/permission/${file_id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.json();
  } catch (error) {
    console.error("Lỗi lấy quyền truy cập:", error);
    return { error: "Không thể lấy quyền truy cập" };
  }
}

