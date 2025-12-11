const API_URL = "http://localhost:5000/api/employees";

export async function getEmployeesApi() {
  try {
    const res = await fetch(`${API_URL}`);
    return res.json();
  } catch (err) {
    return { error: "Không thể tải danh sách nhân viên" };
  }
}

export async function addEmployeeApi(data: any) {
  try {
    const res = await fetch(`${API_URL}/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return res.json();
  } catch (err) {
    return { error: "Không thể kết nối tới server" };
  }
}
export async function deleteEmployeeApi(id: number) {
  try {
    const res = await fetch(`http://localhost:5000/api/employees/delete/${id}`, {
      method: "DELETE"
    });
    return await res.json();
  } catch {
    return { error: "Không thể kết nối server" };
  }
}
export async function updateEmployeeApi(id: number, data: any) {
  try {
    const res = await fetch(`http://localhost:5000/api/employees/update/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return await res.json();
  } catch {
    return { error: "Không thể kết nối server" };
  }
}

export async function getEmployeeStatsApi() {
  try {
    const res = await fetch(`${API_URL}/stats`);
    return res.json();
  } catch {
    return { error: "Không thể tải thống kê nhân sự" };
  }
}

export async function findEmployeeByName(name: string) {
  try {
    const res = await fetch("http://localhost:5000/api/employees/find-by-name", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });

    return await res.json();
  } catch (err) {
    console.error("❌ API findEmployeeByName lỗi:", err);
    return null;
  }
}
