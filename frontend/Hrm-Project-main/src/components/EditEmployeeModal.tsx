import { useState } from "react";
import { X } from "lucide-react";
import Input from "./Input";
import Button from "./Button";
import { updateEmployeeApi } from "../api/employeeAPI";

export default function EditEmployeeModal({ employee, onClose, onUpdated }: any) {
  const [form, setForm] = useState({ ...employee });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const res = await updateEmployeeApi(form.id, form);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    console.log("Cập nhật thành công!");
    onUpdated(form);
    onClose();
  };

  const genderOptions = ["Nam", "Nữ", "Khác"];
  const departmentOptions = ["HR", "Marketing", "Engineering", "Finance", "Support"];
  const roleOptions = ["admin", "manager", "staff"];
  const positionOptions = ["Intern", "Staff", "Senior Staff", "Leader", "Manager"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-xl p-6 relative">

        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black">
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-semibold mb-4">Chỉnh sửa nhân viên</h2>

        {/* Name */}
        <Input
          label="Họ và tên"
          value={form.full_name}
          onChange={(e) => updateField("full_name", e.target.value)}
        />

        {/* Gender */}
        <label className="text-sm font-medium">Giới tính</label>
        <select
          className="w-full border rounded-lg p-2 mb-3"
          value={form.gender}
          onChange={(e) => updateField("gender", e.target.value)}
        >
          {genderOptions.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <Input
          label="Ngày sinh"
          type="date"
          value={form.birthday?.slice(0, 10)}
          onChange={(e) => updateField("birthday", e.target.value)}
        />

        <Input
          label="Email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
        />

        <Input
          label="Số điện thoại"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
        />

        <Input
          label="Địa chỉ"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
        />

        {/* Department */}
        <label className="text-sm font-medium">Phòng ban</label>
        <select
          className="w-full border rounded-lg p-2 mb-3"
          value={form.department}
          onChange={(e) => updateField("department", e.target.value)}
        >
          {departmentOptions.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>

        {/* Position */}
        <label className="text-sm font-medium">Chức vụ</label>
        <select
          className="w-full border rounded-lg p-2 mb-3"
          value={form.position}
          onChange={(e) => updateField("position", e.target.value)}
        >
          {positionOptions.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <Input
          label="Ngày bắt đầu"
          type="date"
          value={form.start_date?.slice(0, 10)}
          onChange={(e) => updateField("start_date", e.target.value)}
        />

        <Input
          label="Lương"
          type="number"
          value={form.salary}
          onChange={(e) => updateField("salary", e.target.value)}
        />

        {/* Role */}
        <label className="text-sm font-medium">Quyền</label>
        <select
          className="w-full border rounded-lg p-2 mb-3"
          value={form.role}
          onChange={(e) => updateField("role", e.target.value)}
        >
          {roleOptions.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        {error && <p className="text-red-500 mb-2">{error}</p>}

        <div className="flex justify-end mt-4">
          <Button loading={loading} onClick={handleSubmit}>
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  );
}
