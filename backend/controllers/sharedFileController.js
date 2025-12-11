import db from "../config/db.js";

// Test kết nối database
export const testDatabaseConnection = (req, res) => {
  db.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ 
        error: "Không thể kết nối database",
        details: {
          code: err.code,
          message: err.message,
          sqlMessage: err.sqlMessage,
        }
      });
    }

    connection.query("SELECT DATABASE() as current_db, USER() as current_user", (err, results) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: "Lỗi query database", details: err.message });
      }

      const currentDb = results[0]?.current_db;
      const currentUser = results[0]?.current_user;

      // Kiểm tra các bảng cần thiết
      connection.query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('shared_files', 'employees', 'file_permissions', 'document_access_logs')",
        [currentDb],
        (err, tables) => {
          connection.release();
          
          if (err) {
            return res.status(500).json({ error: "Lỗi kiểm tra bảng", details: err.message });
          }

          const tableNames = tables.map(t => t.TABLE_NAME);
          
          res.json({
            success: true,
            database: currentDb,
            user: currentUser,
            tables: {
              exists: tableNames,
              missing: ['shared_files', 'employees', 'file_permissions', 'document_access_logs'].filter(t => !tableNames.includes(t)),
            },
            message: tableNames.length === 4 
              ? "Tất cả bảng cần thiết đã tồn tại" 
              : `Thiếu các bảng: ${['shared_files', 'employees', 'file_permissions', 'document_access_logs'].filter(t => !tableNames.includes(t)).join(', ')}`
          });
        }
      );
    });
  });
};

// Tạo file mới và phân quyền
export const createSharedFile = (req, res) => {
  const { name, url, file_type, file_size, audience, assigned_to_email, assigned_to_id, created_by } = req.body;

  console.log("📝 Nhận request tạo file:", { name, url, audience, created_by, assigned_to_email, assigned_to_id });

  // Validation chi tiết
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Tên file không được để trống" });
  }

  if (!url || !url.trim()) {
    return res.status(400).json({ error: "Đường dẫn file không được để trống" });
  }

  if (!created_by) {
    return res.status(400).json({ error: "Thiếu thông tin người tạo (created_by)" });
  }

  // Đảm bảo created_by là number
  const createdById = parseInt(created_by);
  if (isNaN(createdById) || createdById <= 0) {
    return res.status(400).json({ error: `ID người tạo không hợp lệ: ${created_by}` });
  }

  // Kiểm tra xem created_by có tồn tại trong employees không
  const checkUserSql = `SELECT id FROM employees WHERE id = ? LIMIT 1`;
  db.query(checkUserSql, [createdById], (checkErr, checkResult) => {
    if (checkErr) {
      console.error("❌ Lỗi kiểm tra user:", checkErr);
      return res.status(500).json({ error: "Lỗi kiểm tra thông tin người dùng" });
    }

    if (!checkResult || checkResult.length === 0) {
      return res.status(400).json({ 
        error: `Người dùng với ID ${createdById} không tồn tại trong bảng employees. Vui lòng đảm bảo bạn đã đăng nhập với tài khoản hợp lệ.` 
      });
    }

    console.log("✅ Xác nhận user tồn tại:", checkResult[0]);

    // Bước 1: Tạo file
    const insertFileSql = `
      INSERT INTO shared_files (name, url, file_type, file_size, audience, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertFileSql,
      [name.trim(), url.trim(), file_type || null, file_size || null, audience || "staff", createdById],
      (err, fileResult) => {
        if (err) {
          console.error("❌ Lỗi tạo file trong database:", err);
          console.error("Chi tiết lỗi:", {
            code: err.code,
            errno: err.errno,
            sqlMessage: err.sqlMessage,
            sqlState: err.sqlState,
          });
          
          // Trả về thông báo lỗi chi tiết hơn
          let errorMessage = "Lỗi tạo file trong database";
          if (err.code === "ER_NO_SUCH_TABLE") {
            errorMessage = "Bảng shared_files chưa được tạo. Vui lòng chạy migration SQL.";
          } else if (err.code === "ER_BAD_FIELD_ERROR") {
            errorMessage = `Lỗi cấu trúc database: ${err.sqlMessage}`;
          } else if (err.code === "ER_DUP_ENTRY") {
            errorMessage = "File đã tồn tại";
          } else if (err.code === "ER_NO_REFERENCED_ROW_2" || err.code === "ER_NO_REFERENCED_ROW") {
            errorMessage = `Người tạo (ID: ${createdById}) không tồn tại trong bảng employees. Vui lòng kiểm tra lại thông tin đăng nhập.`;
          } else {
            errorMessage = `Lỗi database: ${err.message || err.sqlMessage || "Unknown error"} (Code: ${err.code})`;
          }
          return res.status(500).json({ error: errorMessage });
        }

      const fileId = fileResult.insertId;

      // Bước 2: Phân quyền truy cập
      if (audience === "single" && (assigned_to_email || assigned_to_id)) {
        // Tìm employee_id từ email hoặc id
        const findEmpSql = `
          SELECT id FROM employees 
          WHERE email = ? OR id = ?
          LIMIT 1
        `;
        
        db.query(findEmpSql, [assigned_to_email || null, assigned_to_id || null], (err, empResult) => {
          if (err || empResult.length === 0) {
            // Vẫn tạo file nhưng không có permission
            return res.json({
              success: true,
              file_id: fileId,
              message: "File đã tạo nhưng không tìm thấy nhân viên để phân quyền",
            });
          }

          const employeeId = empResult[0].id;
          const insertPermissionSql = `
            INSERT INTO file_permissions (file_id, employee_id, permission_type, granted_by)
            VALUES (?, ?, 'both', ?)
          `;

          db.query(insertPermissionSql, [fileId, employeeId, createdById], (permErr) => {
            if (permErr) {
              console.error("Lỗi phân quyền:", permErr);
            }
            res.json({ success: true, file_id: fileId });
          });
        });
      } else {
        // audience = "all" hoặc "staff" - không cần tạo permission riêng
        res.json({ success: true, file_id: fileId });
      }
    }
    );
  });
};

// Lấy danh sách file có thể truy cập của một nhân viên
export const getAccessibleFilesForEmployee = (req, res) => {
  const { employee_id } = req.params;
  
  // Parse employee_id thành number
  const employeeId = parseInt(employee_id);
  if (isNaN(employeeId) || employeeId <= 0) {
    console.error(`❌ Employee ID không hợp lệ: ${employee_id}`);
    return res.status(400).json({ error: `Employee ID không hợp lệ: ${employee_id}` });
  }

  console.log(`🔍 Đang tìm nhân viên với ID: ${employeeId} (từ params: ${employee_id})`);

  // Lấy thông tin nhân viên
  const empSql = `SELECT id, email, role, department FROM employees WHERE id = ?`;
  
  db.query(empSql, [employeeId], (err, empResult) => {
    if (err) {
      console.error(`❌ Lỗi query database khi tìm nhân viên ID ${employeeId}:`, err);
      return res.status(500).json({ error: "Lỗi truy vấn database", details: err.message });
    }
    
    if (!empResult || empResult.length === 0) {
      console.error(`❌ Không tìm thấy nhân viên với ID: ${employeeId}`);
      // Debug: Kiểm tra xem có nhân viên nào trong database không
      db.query("SELECT id, email, role FROM employees LIMIT 5", (debugErr, debugResult) => {
        if (!debugErr && debugResult) {
          console.log(`📋 Danh sách nhân viên trong database (5 đầu tiên):`, debugResult);
        }
      });
      return res.status(404).json({ error: `Không tìm thấy nhân viên với ID: ${employeeId}` });
    }

    const employee = empResult[0];
    const employeeRole = employee.role || '';

    console.log(`✅ Tìm thấy nhân viên:`, {
      id: employee.id,
      email: employee.email,
      role: employeeRole,
      department: employee.department
    });

    // Lấy file có thể truy cập:
    // 1. audience = "all" - tất cả đều truy cập được
    // 2. audience = "staff" - chỉ nhân viên có role = 'staff' mới truy cập được
    // 3. audience = "single" - chỉ nhân viên có permission mới truy cập được
    const sql = `
      SELECT DISTINCT
        sf.id,
        sf.name,
        sf.url,
        sf.file_type,
        sf.file_size,
        sf.audience,
        sf.created_at,
        fp.permission_type
      FROM shared_files sf
      LEFT JOIN file_permissions fp ON sf.id = fp.file_id AND fp.employee_id = ?
      WHERE 
        sf.audience = 'all'
        OR (sf.audience = 'staff' AND ? = 'staff')
        OR (sf.audience = 'single' AND fp.id IS NOT NULL)
      ORDER BY sf.created_at DESC
    `;

    console.log(`🔍 Đang query file với employeeId: ${employeeId}, role: ${employeeRole}`);

    db.query(sql, [employeeId, employeeRole], (err, results) => {
      if (err) {
        console.error("❌ Lỗi lấy file có thể truy cập:", err);
        return res.status(500).json({ error: "Lỗi lấy file có thể truy cập", details: err.message });
      }

      console.log(`✅ Tìm thấy ${results?.length || 0} file cho nhân viên ID: ${employeeId}, Role: ${employeeRole}`);
      if (results && results.length > 0) {
        console.log("📄 Danh sách file:", results.map(f => ({ id: f.id, name: f.name, audience: f.audience })));
      }
      res.json(results || []);
    });
  });
};

// Lấy tất cả file (cho admin/manager)
export const getAllSharedFiles = (req, res) => {
  const sql = `
    SELECT 
      sf.*,
      e.full_name as created_by_name,
      e.email as created_by_email,
      COUNT(DISTINCT fp.id) as permission_count
    FROM shared_files sf
    LEFT JOIN employees e ON sf.created_by = e.id
    LEFT JOIN file_permissions fp ON sf.id = fp.file_id
    GROUP BY sf.id
    ORDER BY sf.created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Lỗi lấy danh sách file:", err);
      return res.status(500).json({ error: "Lỗi lấy danh sách file" });
    }

    res.json(results || []);
  });
};

// Xóa file
export const deleteSharedFile = (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM shared_files WHERE id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Lỗi xóa file:", err);
      return res.status(500).json({ error: "Lỗi xóa file" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy file" });
    }

    res.json({ success: true, message: "File đã được xóa" });
  });
};

// Thêm/quyền truy cập cho nhân viên cụ thể
export const addFilePermission = (req, res) => {
  const { file_id, employee_id, permission_type = "both", granted_by } = req.body;

  if (!file_id || !employee_id) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  const sql = `
    INSERT INTO file_permissions (file_id, employee_id, permission_type, granted_by)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      permission_type = VALUES(permission_type),
      granted_at = CURRENT_TIMESTAMP
  `;

  db.query(sql, [file_id, employee_id, permission_type, granted_by || null], (err, result) => {
    if (err) {
      console.error("Lỗi thêm quyền:", err);
      return res.status(500).json({ error: "Lỗi thêm quyền" });
    }

    res.json({ success: true, permission_id: result.insertId });
  });
};

// Xóa quyền truy cập
export const removeFilePermission = (req, res) => {
  const { file_id, employee_id } = req.params;

  const sql = `DELETE FROM file_permissions WHERE file_id = ? AND employee_id = ?`;

  db.query(sql, [file_id, employee_id], (err, result) => {
    if (err) {
      console.error("Lỗi xóa quyền:", err);
      return res.status(500).json({ error: "Lỗi xóa quyền" });
    }

    res.json({ success: true, message: "Quyền đã được xóa" });
  });
};

// Lấy danh sách nhân viên có quyền truy cập file cụ thể
export const getFilePermissions = (req, res) => {
  const { file_id } = req.params;

  const sql = `
    SELECT 
      fp.*,
      e.full_name,
      e.email,
      e.department
    FROM file_permissions fp
    JOIN employees e ON fp.employee_id = e.id
    WHERE fp.file_id = ?
  `;

  db.query(sql, [file_id], (err, results) => {
    if (err) {
      console.error("Lỗi lấy quyền truy cập:", err);
      return res.status(500).json({ error: "Lỗi lấy quyền truy cập" });
    }

    res.json(results || []);
  });
};

