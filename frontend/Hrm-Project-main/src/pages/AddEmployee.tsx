import { useState } from "react";
import { HelpCircle } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import { addEmployeeApi } from "../api/employeeAPI";
import { useNavigate } from "react-router-dom";

export default function AddEmployee() {
  const navigate = useNavigate();

  // ---------------- STATE LƯU FORM ----------------
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

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------------- HANDLE CHANGE ----------------
  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ---------------- RENDER TITLE STEP ----------------
  const StepTitle = ({ title }: { title: string }) => (
    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
      <HelpCircle className="w-5 h-5 text-blue-500" />
      {title}
    </h2>
  );

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const res = await addEmployeeApi(form);
    setLoading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    console.log("Thêm nhân viên thành công!");
    navigate("/employees");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-md p-8">
        {/* ---------------- Step 1 ---------------- */}
        {step === 1 && (
          <>
            <StepTitle title="Thông tin cá nhân" />

            <Input
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
            />

            <Input
              label="Giới tính"
              placeholder="Nam / Nữ"
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
            />

            <Input
              label="Ngày sinh"
              type="date"
              value={form.birthday}
              onChange={(e) => updateField("birthday", e.target.value)}
            />

            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)}>Tiếp tục</Button>
            </div>
          </>
        )}

        {/* ---------------- Step 2 ---------------- */}
        {step === 2 && (
          <>
            <StepTitle title="Thông tin liên hệ" />

            <Input
              label="Email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />

            <Input
              label="Số điện thoại"
              placeholder="0123456789"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />

            <Input
              label="Địa chỉ"
              placeholder="Hà Nội, Việt Nam"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button onClick={() => setStep(3)}>Tiếp tục</Button>
            </div>
          </>
        )}

        {/* ---------------- Step 3 ---------------- */}
        {step === 3 && (
          <>
            <StepTitle title="Thông tin công việc" />

            <Input
              label="Phòng ban"
              placeholder="IT / HR / Kế toán"
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
            />

            <Input
              label="Chức vụ"
              placeholder="Nhân viên / Quản lý"
              value={form.position}
              onChange={(e) => updateField("position", e.target.value)}
            />

            <Input
              label="Ngày bắt đầu làm việc"
              type="date"
              value={form.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
            />

            <Input
              label="Lương cơ bản"
              placeholder="10000000"
              type="number"
              value={form.salary}
              onChange={(e) => updateField("salary", e.target.value)}
            />

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Quay lại
              </Button>
              <Button onClick={() => setStep(4)}>Tiếp tục</Button>
            </div>
          </>
        )}

        {/* ---------------- Step 4 ---------------- */}
        {step === 4 && (
          <>
            <StepTitle title="Thiết lập hệ thống" />

            <Input
              label="Quyền trong hệ thống"
              placeholder="Admin / Manager / Staff"
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
            />

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <div className="flex justify-between mt-6">
              <Button variant="secondary" onClick={() => setStep(3)}>
                Quay lại
              </Button>

              <Button loading={loading} onClick={handleSubmit}>
                Hoàn tất
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
