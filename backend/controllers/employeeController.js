import db from "../config/db.js";

// GET full list
export const getEmployees = (req, res) => {
  const q = "SELECT * FROM employees";

  db.query(q, (err, data) => {
    if (err) return res.json({ error: "Lỗi lấy danh sách nhân viên" });
    return res.json(data);
  });
};

// ⭐ ADD EMPLOYEE + TẠO TÀI KHOẢN LOGIN (PASSWORD TEXT – KHÔNG BCRYPT)
export const addEmployee = (req, res) => {
  const d = req.body;

  // ⭐ CHECK EMAIL TRÙNG
  const checkEmail = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmail, [d.email], (err0, result0) => {
    if (err0) return res.status(500).json({ error: "Lỗi kiểm tra email" });

    if (result0.length > 0) {
      return res.status(400).json({ error: "Email đã tồn tại trong hệ thống" });
    }

    // ⭐ INSERT EMPLOYEE
    const q = `
      INSERT INTO employees 
      (full_name, gender, birthday, email, phone, address, department, position, start_date, salary, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      d.full_name,
      d.gender,
      d.birthday,
      d.email,
      d.phone,
      d.address,
      d.department,
      d.position,
      d.start_date,
      d.salary,
      d.role,
    ];

    db.query(q, values, (err, result) => {
      if (err) {
        console.log("MySQL ERROR:", err);
        return res.status(500).json({ error: "Lỗi khi thêm nhân viên" });
      }

      // ⭐ TẠO USER LOGIN (PASSWORD = 123456)
      const userSQL = `
        INSERT INTO users (email, password, role)
        VALUES (?, ?, ?)
      `;

      db.query(userSQL, [d.email, "123456", d.role], (err2) => {
        if (err2) {
          console.log("Lỗi tạo user:", err2);
          return res.status(500).json({
            error: "Đã thêm nhân viên nhưng lỗi tạo tài khoản login"
          });
        }

        return res.json({
          success: true,
          employee_id: result.insertId,
          message: "Đã thêm nhân viên + tạo tài khoản đăng nhập",
          login_email: d.email,
          login_password: "123456"
        });
      });
    });
  });
};

// ⭐ UPDATE EMPLOYEE + UPDATE EMAIL TRONG users
export const updateEmployee = (req, res) => {
  const { id } = req.params;
  const d = req.body;

  const q = `
    UPDATE employees SET
      full_name = ?,
      gender = ?,
      birthday = ?,
      email = ?,
      phone = ?,
      address = ?,
      department = ?,
      position = ?,
      start_date = ?,
      salary = ?,
      role = ?
    WHERE id = ?
  `;

  const values = [
    d.full_name,
    d.gender,
    d.birthday || null,
    d.email,
    d.phone,
    d.address,
    d.department,
    d.position,
    d.start_date,
    d.salary,
    d.role,
    id,
  ];

  db.query(q, values, (err) => {
    if (err) {
      console.log("MySQL ERROR:", err);
      return res.status(500).json({ error: "Lỗi khi cập nhật nhân viên" });
    }

    // ⭐ SYNC EMAIL SANG USERS
    const updateUser = `
      UPDATE users SET email = ?
      WHERE email = ?
    `;

    db.query(updateUser, [d.email, d.old_email], (err2) => {
      if (err2) console.log("Lỗi cập nhật email user:", err2);
    });

    return res.json({ success: true });
  });
};

// ⭐ DELETE EMPLOYEE + DELETE USER
export const deleteEmployee = (req, res) => {
  const { id } = req.params;

  // Lấy email nhân viên trước
  db.query("SELECT email FROM employees WHERE id = ?", [id], (err0, result0) => {
    if (err0 || result0.length === 0) {
      return res.status(500).json({ error: "Không tìm thấy email để xóa user" });
    }

    const email = result0[0].email;

    // ⭐ XÓA USER
    db.query("DELETE FROM users WHERE email = ?", [email], (err1) => {
      if (err1) console.log("Lỗi xóa user:", err1);

      // ⭐ XÓA EMPLOYEE
      db.query("DELETE FROM employees WHERE id = ?", [id], (err2) => {
        if (err2) {
          console.log("MySQL ERROR:", err2);
          return res.status(500).json({ error: "Lỗi khi xóa nhân viên" });
        }

        return res.json({ success: true, message: "Đã xóa nhân viên + user" });
      });
    });
  });
};

// ⭐ FIND EMPLOYEE BY NAME (FACE RECOGNITION)
export const findEmployeeByName = (req, res) => {
  const { name } = req.body;

  db.query("SELECT * FROM employees WHERE full_name = ?", [name], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi MySQL" });

    if (result.length === 0)
      return res.json({ error: "Không tìm thấy nhân viên" });

    return res.json(result[0]);
  });
};
export const getEmployeeProfile = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT id, full_name, email, department, position, phone, address, avatar
    FROM employees
    WHERE id = ?
  `;

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: "DB error" });

    if (result.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.json(result[0]);
  });
};
// 🔍 Lấy thông tin nhân viên theo email
export const getEmployeeByEmail = (req, res) => {
  const { email } = req.params;

  const sql = `
    SELECT id, full_name, email, department, position, phone, address, avatar
    FROM employees
    WHERE email = ?
  `;

  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Lỗi truy vấn DB" });

    if (results.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy nhân viên" });
    }

    return res.json(results[0]);
  });
};

// 📊 Tổng hợp số liệu nhân sự cho dashboard
export const getEmployeeStats = (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) AS totalEmployees,
      SUM(
        CASE 
          WHEN LOWER(IFNULL(department, '')) LIKE '%design%' 
            OR LOWER(IFNULL(position, '')) LIKE '%design%' 
          THEN 1 ELSE 0 
        END
      ) AS designEmployees,
      SUM(
        CASE 
          WHEN start_date IS NOT NULL 
               AND start_date >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH) 
          THEN 1 ELSE 0 
        END
      ) AS joinedLast30Days
    FROM employees
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Lỗi tính toán thống kê nhân sự:", err);
      return res.status(500).json({ error: "Lỗi tính toán thống kê nhân sự" });
    }

    const stats = result?.[0] || {};

    // Lấy breakdown theo phòng ban
    const deptSql = `
      SELECT 
        COALESCE(NULLIF(TRIM(department), ''), 'Unknown') AS department,
        COUNT(*) AS total
      FROM employees
      GROUP BY COALESCE(NULLIF(TRIM(department), ''), 'Unknown')
    `;

    db.query(deptSql, (deptErr, deptResult) => {
      if (deptErr) {
        console.error("Lỗi tính toán thống kê phòng ban:", deptErr);
        return res.status(500).json({ error: "Lỗi tính toán thống kê phòng ban" });
      }

      return res.json({
        totalEmployees: stats.totalEmployees || 0,
        designEmployees: stats.designEmployees || 0,
        joinedLast30Days: stats.joinedLast30Days || 0,
        onLeaveEmployees: 0, // Có thể cập nhật khi có bảng nghỉ phép
        newJustifications: 0, // Placeholder cho dữ liệu liên quan tới đơn giải trình
        departmentBreakdown: deptResult || [],
      });
    });
  });
};
