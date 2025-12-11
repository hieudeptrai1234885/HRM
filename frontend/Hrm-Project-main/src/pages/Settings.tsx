import { useEffect, useState } from "react";

interface ProfileData {
  full_name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  address: string;
}

export default function Settings() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("userEmail");

    if (!email) {
      console.log("NO USER EMAIL");
      setError("Không tìm thấy email đăng nhập");
      setLoading(false);
      return;
    }

    fetch(`http://localhost:5000/api/employees/profile/email/${email}`)

      .then((res) => {
        if (!res.ok) throw new Error("API NOT FOUND");
        return res.json();
      })
      .then((data) => {
        console.log("PROFILE OK:", data);
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Fetch error:", err);
        setError("Không tìm thấy thông tin người dùng");
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-lg">Đang tải thông tin...</div>;

  if (error) return <div className="p-6 text-red-500 text-lg">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Hồ sơ cá nhân</h2>
      <div className="bg-white rounded-lg shadow p-4">
        <p><strong>Họ tên:</strong> {profile?.full_name}</p>
        <p><strong>Email:</strong> {profile?.email}</p>
        <p><strong>Phòng ban:</strong> {profile?.department}</p>
        <p><strong>Chức vụ:</strong> {profile?.position}</p>
        <p><strong>SĐT:</strong> {profile?.phone}</p>
        <p><strong>Địa chỉ:</strong> {profile?.address}</p>
      </div>
    </div>
  );
}
