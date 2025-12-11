// API cho document access tracking

export async function logFileAccess(data: {
  employee_id: number;
  file_id: string;
  file_name?: string;
  file_url?: string;
  action: "view" | "download";
  location?: string;
}) {
  try {
    const res = await fetch("http://localhost:5000/api/document-access/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  } catch (error) {
    console.error("Lỗi log truy cập file:", error);
    return { error: "Không thể log truy cập file" };
  }
}

export async function getSuspiciousActivities(days: number = 7) {
  try {
    const res = await fetch(
      `http://localhost:5000/api/document-access/suspicious?days=${days}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.json();
  } catch (error) {
    console.error("Lỗi lấy hoạt động bất thường:", error);
    return { error: "Không thể lấy hoạt động bất thường" };
  }
}

export async function getEmployeeAccessHistory(employee_id: number, limit: number = 50) {
  try {
    const res = await fetch(
      `http://localhost:5000/api/document-access/employee/${employee_id}?limit=${limit}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.json();
  } catch (error) {
    console.error("Lỗi lấy lịch sử truy cập:", error);
    return { error: "Không thể lấy lịch sử truy cập" };
  }
}

export async function getAccessibleFiles(employee_id: number) {
  try {
    const res = await fetch(
      `http://localhost:5000/api/document-access/accessible/${employee_id}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.json();
  } catch (error) {
    console.error("Lỗi lấy file có thể truy cập:", error);
    return { error: "Không thể lấy file có thể truy cập" };
  }
}

export async function getAllEmployeesWithAccessInfo() {
  try {
    const res = await fetch(
      "http://localhost:5000/api/document-access/employees-with-access",
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return res.json();
  } catch (error) {
    console.error("Lỗi lấy danh sách nhân viên với quyền truy cập:", error);
    return { error: "Không thể lấy danh sách nhân viên" };
  }
}

