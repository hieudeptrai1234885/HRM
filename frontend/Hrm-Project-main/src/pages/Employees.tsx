import { useEffect, useState } from "react";
import {
  getEmployeesApi,
  deleteEmployeeApi,
} from "../api/employeeAPI";
import EditEmployeeModal from "../components/EditEmployeeModal";

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getEmployeesApi();
    setEmployees(data);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa nhân viên này?")) return;

    const res = await deleteEmployeeApi(id);

    if (res.error) {
      console.error(res.error);
      return;
    }

    console.log("Đã xóa nhân viên!");
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const filteredEmployees = employees.filter((e) => {
    const matchSearch =
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());

    const matchDept = filterDept ? e.department === filterDept : true;
    const matchRole = filterRole ? e.role === filterRole : true;

    return matchSearch && matchDept && matchRole;
  });

  const departments = ["HR", "Marketing", "Engineering", "Finance", "Support"];
  const roles = ["admin", "manager", "staff"];

  const generateAvatar = (name: string) => {
    const letter = name.charAt(0).toUpperCase();
    const colors = ["#E57373", "#64B5F6", "#81C784", "#FFD54F", "#BA68C8"];
    const bg = colors[name.length % colors.length];

    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
        style={{ background: bg }}
      >
        {letter}
      </div>
    );
  };

  return (
    <div className="p-4">

      <h2 className="text-2xl font-bold mb-4">Employees</h2>

      {/* FILTER + SEARCH */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Tìm theo tên hoặc email..."
          className="border p-2 rounded-lg flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded-lg"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">Phòng ban</option>
          {departments.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>

        <select
          className="border p-2 rounded-lg"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Role</option>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        {(filterDept || filterRole || search) && (
          <button
            className="px-3 py-2 bg-gray-200 rounded-lg"
            onClick={() => {
              setSearch("");
              setFilterDept("");
              setFilterRole("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* EMPLOYEE TABLE */}
      <table className="w-full border-collapse rounded-xl overflow-hidden shadow">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Avatar</th>
            <th className="p-3">Full Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Department</th>
            <th className="p-3">Phone</th>
            <th className="p-3">Join Date</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredEmployees.map((e) => (
            <tr
              key={e.id}
              className="border-t hover:bg-gray-50 transition"
            >
              <td className="p-3">{generateAvatar(e.full_name)}</td>
              <td className="p-3 font-medium">{e.full_name}</td>
              <td className="p-3">{e.email}</td>
              <td className="p-3">{e.role}</td>
              <td className="p-3">{e.department}</td>
              <td className="p-3">{e.phone}</td>
              <td className="p-3">{e.start_date}</td>

              <td className="p-3 flex gap-3">
                <button
                  className="text-blue-600 hover:underline"
                  onClick={() => setEditing(e)}
                >
                  Edit
                </button>

                <button
                  className="text-red-600 hover:underline"
                  onClick={() => handleDelete(e.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* POPUP EDIT */}
      {editing && (
        <EditEmployeeModal
          employee={editing}
          onClose={() => setEditing(null)}
          onUpdated={(newData: any) => {
            setEmployees((prev) =>
              prev.map((x) => (x.id === newData.id ? newData : x))
            );
          }}
        />
      )}
    </div>
  );
}
