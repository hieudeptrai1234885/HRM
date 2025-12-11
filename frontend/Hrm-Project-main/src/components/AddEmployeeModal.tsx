import { useState } from "react";
import { X } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import { addEmployeeApi } from "../api/employeeAPI";

export default function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    full_name: "",
    gender: "",
    birthday: "",
    email: "",
    phone: "",
    address: "",
    department: "",
    position: "",
    start_date: "",
    salary: "",
    role: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const res = await addEmployeeApi(form);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    console.log("✔️ Thêm nhân viên thành công!");
    onClose();
  };

  // OPTIONS
  const genderOptions = ["Nam", "Nữ", "Khác"];
  const departmentOptions = [
    "HR",
    "Marketing",
    "Engineering",
    "Finance",
    "Support",
    "Operations",
  ];
  const positionOptions = [
    "Intern",
    "Staff",
    "Senior Staff",
    "Leader",
    "Manager",
    "Director",
  ];
  const roleOptions = ["admin", "manager", "staff"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-7 relative animate-fadeIn">

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-black transition"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold mb-4 text-gray-800">Thêm Nhân Viên</h2>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Họ và tên"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
            />

            {/* Gender */}
            <label className="font-medium text-sm">Giới tính</label>
            <select
              className="w-full border rounded-lg p-2 bg-white"
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
            >
              <option value="">Chọn giới tính</option>
              {genderOptions.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>

            <Input
              label="Ngày sinh"
              type="date"
              value={form.birthday}
              onChange={(e) => updateField("birthday", e.target.value)}
            />

            <div className="text-right">
              <Button onClick={() => setStep(2)}>Tiếp tục</Button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
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

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button onClick={() => setStep(3)}>Tiếp tục</Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Department */}
            <label className="font-medium text-sm">Phòng ban</label>
            <select
              className="w-full border rounded-lg p-2 bg-white"
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
            >
              <option value="">Chọn phòng ban</option>
              {departmentOptions.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>

            {/* Position */}
            <label className="font-medium text-sm">Chức vụ</label>
            <select
              className="w-full border rounded-lg p-2 bg-white"
              value={form.position}
              onChange={(e) => updateField("position", e.target.value)}
            >
              <option value="">Chọn chức vụ</option>
              {positionOptions.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>

            <Input
              label="Ngày bắt đầu"
              type="date"
              value={form.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
            />

            <Input
              label="Lương cơ bản"
              type="number"
              value={form.salary}
              onChange={(e) => updateField("salary", e.target.value)}
            />

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Quay lại
              </Button>
              <Button onClick={() => setStep(4)}>Tiếp tục</Button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Role */}
            <label className="font-medium text-sm">Quyền</label>
            <select
              className="w-full border rounded-lg p-2 bg-white"
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
            >
              <option value="">Chọn quyền</option>
              {roleOptions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>

            {error && <p className="text-red-500 font-medium">{error}</p>}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Quay lại
              </Button>
              <Button loading={loading} onClick={handleSubmit}>
                Hoàn tất
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
