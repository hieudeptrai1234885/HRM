import jwt from "jsonwebtoken";
import db from "../config/db.js";




// ========== VERIFY OTP (sau khi người dùng nhập OTP) ==========
export const verifyOTP = (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ error: "Thiếu email hoặc OTP" });

  const sql =
    "SELECT * FROM otp_codes WHERE email = ? ORDER BY id DESC LIMIT 1";

  db.query(sql, [email], (err, rows) => {
    if (err) return res.status(500).json({ error: "Lỗi database" });

    if (rows.length === 0)
      return res.status(400).json({ error: "OTP không tồn tại" });

    const record = rows[0];

    const inputOTP = otp.toString().trim();
    const dbOTP = record.otp_code.toString().trim();

    // FIX SO SÁNH OTP
    if (inputOTP !== dbOTP)
      return res.status(400).json({ error: "OTP sai" });

    // Check hạn OTP
    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ error: "OTP hết hạn" });

    // Tạo JWT token
    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.json({
      message: "OTP hợp lệ",
      token,
    });
  });
};
// ⭐ LOGIN NHÂN VIÊN (KHÔNG DÙNG BCRYPT)
export const login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });

  // Tìm user theo email - ưu tiên lấy ID từ employees
  const sql = `
    SELECT 
      u.*, 
      e.id as employee_id,
      e.full_name, 
      e.department, 
      e.position,
      e.role as employee_role
    FROM users u
    LEFT JOIN employees e ON u.email = e.email
    WHERE u.email = ?
  `;

  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi database" });

    if (result.length === 0)
      return res.status(400).json({ error: "Email không tồn tại" });

    const user = result[0];

    // ⭐ So sánh mật khẩu TEXT (không hash)
    if (password !== user.password) {
      return res.status(400).json({ error: "Sai mật khẩu" });
    }

    // ⭐ Ưu tiên sử dụng employee_id nếu có, nếu không thì dùng user.id
    const userId = user.employee_id || user.id;
    const userRole = user.employee_role || user.role;

    console.log(`🔐 Login thành công:`, {
      email: user.email,
      user_id_from_users: user.id,
      employee_id_from_employees: user.employee_id,
      final_user_id: userId,
      role: userRole
    });

    // ⭐ Trả về user info với ID từ employees (nếu có)
    return res.json({
      success: true,
      user: {
        id: userId, // Sử dụng employee_id nếu có
        email: user.email,
        full_name: user.full_name || user.full_name,
        department: user.department,
        position: user.position,
        role: userRole
      }
    });
  });
};