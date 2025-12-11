// src/api/attendanceAPI.ts

export async function findEmployeeByName(name: string) {
  const res = await fetch("http://localhost:5000/api/employees/find-by-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  return res.json();
}

export async function checkInApi(data: any) {
  const res = await fetch("http://localhost:5000/api/attendance/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function getTodayAttendance(employee_id: number) {
  const res = await fetch(`http://localhost:5000/api/attendance/today/${employee_id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  return res.json();
}