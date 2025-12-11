import db from "../config/db.js";

// Log truy cập file
export const logFileAccess = (req, res) => {
  const { employee_id, file_id, file_name, file_url, action, location } = req.body;

  if (!employee_id || !file_id || !action) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
  }

  // Convert file_id to number if it's a string (for compatibility with old localStorage IDs)
  // If file_id is a number (from database), use it directly
  // If file_id is a string UUID (from old localStorage), set file_id column to NULL but keep file_name/file_url
  let dbFileId = null;
  if (typeof file_id === "number" || !isNaN(parseInt(file_id))) {
    dbFileId = parseInt(file_id);
  }

  const sql = `
    INSERT INTO document_access_logs 
    (employee_id, file_id, file_name, file_url, action, location, accessed_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  db.query(
    sql,
    [employee_id, dbFileId, file_name || null, file_url || null, action, location || null],
    (err, result) => {
      if (err) {
        console.error("Lỗi log truy cập file:", err);
        return res.status(500).json({ error: "Lỗi log truy cập file" });
      }

      res.json({ success: true, log_id: result.insertId });
    }
  );
};

// Lấy danh sách các hoạt động bất thường
export const getSuspiciousActivities = (req, res) => {
  const { days = 7 } = req.query;

  // Truy vấn các hoạt động bất thường:
  // 1. Truy cập quá nhiều file trong 1 giờ (> 10)
  // 2. Tải về quá nhiều file trong 1 giờ (> 5)
  // 3. Truy cập vào giờ không bình thường (22h-6h)
  const sql = `
    SELECT 
      dal.employee_id,
      e.full_name,
      e.email,
      e.department,
      COUNT(DISTINCT dal.file_id) as file_count,
      SUM(CASE WHEN dal.action = 'download' THEN 1 ELSE 0 END) as download_count,
      DATE_FORMAT(dal.accessed_at, '%Y-%m-%d %H:00:00') as hour_period,
      MIN(dal.accessed_at) as first_access,
      MAX(dal.accessed_at) as last_access,
      GROUP_CONCAT(DISTINCT dal.file_name SEPARATOR ', ') as accessed_files,
      CASE 
        WHEN COUNT(DISTINCT dal.file_id) > 10 THEN 'high_access_rate'
        WHEN SUM(CASE WHEN dal.action = 'download' THEN 1 ELSE 0 END) > 5 THEN 'high_download_rate'
        WHEN HOUR(dal.accessed_at) >= 22 OR HOUR(dal.accessed_at) < 6 THEN 'unusual_hours'
        ELSE 'normal'
      END as suspicious_type
    FROM document_access_logs dal
    JOIN employees e ON dal.employee_id = e.id
    WHERE dal.accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY 
      dal.employee_id,
      DATE_FORMAT(dal.accessed_at, '%Y-%m-%d %H:00:00')
    HAVING 
      COUNT(DISTINCT dal.file_id) > 10 
      OR SUM(CASE WHEN dal.action = 'download' THEN 1 ELSE 0 END) > 5
      OR HOUR(MIN(dal.accessed_at)) >= 22 
      OR HOUR(MIN(dal.accessed_at)) < 6
    ORDER BY dal.accessed_at DESC
    LIMIT 100
  `;

  db.query(sql, [days], (err, results) => {
    if (err) {
      console.error("Lỗi lấy hoạt động bất thường:", err);
      return res.status(500).json({ error: "Lỗi lấy hoạt động bất thường" });
    }

    res.json(results || []);
  });
};

// Lấy lịch sử truy cập của một nhân viên
export const getEmployeeAccessHistory = (req, res) => {
  const { employee_id } = req.params;
  const { limit = 50 } = req.query;

  const sql = `
    SELECT 
      dal.*,
      e.full_name,
      e.email
    FROM document_access_logs dal
    JOIN employees e ON dal.employee_id = e.id
    WHERE dal.employee_id = ?
    ORDER BY dal.accessed_at DESC
    LIMIT ?
  `;

  db.query(sql, [employee_id, limit], (err, results) => {
    if (err) {
      console.error("Lỗi lấy lịch sử truy cập:", err);
      return res.status(500).json({ error: "Lỗi lấy lịch sử truy cập" });
    }

    res.json(results || []);
  });
};

// Lấy danh sách file mà nhân viên có thể truy cập
export const getAccessibleFiles = (req, res) => {
  const { employee_id } = req.params;

  // Lấy thông tin nhân viên để xác định quyền truy cập
  const empSql = `SELECT id, email, role, department FROM employees WHERE id = ?`;

  db.query(empSql, [employee_id], (err, empResult) => {
    if (err || empResult.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy nhân viên" });
    }

    const employee = empResult[0];

    // Lấy file từ localStorage (tạm thời) hoặc từ database nếu có
    // Vì hiện tại file được lưu trong localStorage, ta sẽ trả về thông tin từ đó
    // Trong tương lai có thể lưu vào database
    res.json({
      employee: {
        id: employee.id,
        email: employee.email,
        role: employee.role,
        department: employee.department,
      },
      accessible_files: [], // Sẽ được populate từ frontend
      message: "Lấy danh sách file từ frontend localStorage",
    });
  });
};

// Lấy danh sách tất cả nhân viên với thông tin quyền truy cập file
export const getAllEmployeesWithAccessInfo = (req, res) => {
  // Query để lấy thông tin nhân viên và tính số file có thể truy cập từ database
  const sql = `
    SELECT 
      e.id,
      e.full_name,
      e.email,
      e.department,
      e.position,
      e.avatar_url,
      e.role,
      COUNT(DISTINCT dal.id) as access_count_7days,
      COUNT(DISTINCT CASE WHEN dal.action = 'download' THEN dal.id END) as download_count_7days,
      COUNT(DISTINCT CASE 
        WHEN sf.audience = 'all' THEN sf.id
        WHEN sf.audience = 'staff' AND e.role = 'staff' THEN sf.id
        WHEN sf.audience = 'single' AND fp.id IS NOT NULL THEN sf.id
        ELSE NULL
      END) as accessible_file_count
    FROM employees e
    LEFT JOIN document_access_logs dal ON e.id = dal.employee_id 
      AND dal.accessed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    LEFT JOIN shared_files sf ON (
      sf.audience = 'all' 
      OR (sf.audience = 'staff' AND e.role = 'staff')
      OR sf.audience = 'single'
    )
    LEFT JOIN file_permissions fp ON sf.id = fp.file_id 
      AND fp.employee_id = e.id 
      AND sf.audience = 'single'
    GROUP BY e.id, e.full_name, e.email, e.department, e.position, e.avatar_url, e.role
    ORDER BY e.full_name ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Lỗi lấy danh sách nhân viên với quyền truy cập:", err);
      return res.status(500).json({ error: "Lỗi lấy danh sách nhân viên", details: err.message });
    }

    const employeesWithAccess = results.map((emp) => {
      return {
        ...emp,
        accessible_file_count: parseInt(emp.accessible_file_count) || 0,
        access_count_7days: parseInt(emp.access_count_7days) || 0,
        download_count_7days: parseInt(emp.download_count_7days) || 0,
      };
    });

    console.log(`✅ Trả về ${employeesWithAccess.length} nhân viên với thông tin quyền truy cập`);
    res.json(employeesWithAccess);
  });
};

