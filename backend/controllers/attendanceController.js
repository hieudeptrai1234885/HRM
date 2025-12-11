import db from "../config/db.js";

// Check-in hoặc Check-out tự động
export const checkIn = (req, res) => {
  const { employee_id, name } = req.body;

  // Hàm xử lý check-in/check-out
  const processAttendance = (empId) => {
    // Kiểm tra xem hôm nay đã có attendance chưa
    const checkToday = `
      SELECT id, time_in, time_out 
      FROM attendances 
      WHERE employee_id = ? AND date = CURDATE()
    `;

    db.query(checkToday, [empId], (err, result) => {
      if (err) {
        console.error("Lỗi kiểm tra attendance:", err);
        return res.status(500).json({ error: "Lỗi kiểm tra attendance" });
      }

      if (result.length === 0) {
        // Chưa có attendance hôm nay → Check-in
        const sql = `
          INSERT INTO attendances (employee_id, time_in, date)
          VALUES (?, NOW(), CURDATE())
        `;

        db.query(sql, [empId], (err, result) => {
          if (err) {
            console.error("Lỗi ghi check-in:", err);
            return res.status(500).json({ error: "Lỗi ghi check-in" });
          }

          res.json({ 
            success: true, 
            type: "checkin",
            message: "Check-in thành công!",
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          });
        });
      } else {
        const attendance = result[0];
        if (attendance.time_out) {
          // Đã check-out rồi → Không làm gì
          return res.json({ 
            success: false, 
            message: "Bạn đã check-out hôm nay rồi!" 
          });
        } else {
          // Đã check-in nhưng chưa check-out → Check-out
          const sql = `
            UPDATE attendances 
            SET time_out = NOW() 
            WHERE id = ?
          `;

          db.query(sql, [attendance.id], (err, result) => {
            if (err) {
              console.error("Lỗi ghi check-out:", err);
              return res.status(500).json({ error: "Lỗi ghi check-out" });
            }

            res.json({ 
              success: true, 
              type: "checkout",
              message: "Check-out thành công!",
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            });
          });
        }
      }
    });
  };

  // Nếu có employee_id thì dùng trực tiếp
  if (employee_id) {
    processAttendance(employee_id);
  } else if (name) {
    // Tìm employee theo name
    db.query("SELECT id FROM employees WHERE full_name = ?", [name], (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Lỗi tìm nhân viên" });
      }
      if (result.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy nhân viên" });
      }
      processAttendance(result[0].id);
    });
  } else {
    return res.status(400).json({ error: "Thiếu employee_id hoặc name" });
  }
};

// Lấy attendance hôm nay
export const getTodayAttendance = (req, res) => {
  const { employee_id } = req.params;

  const sql = `
    SELECT 
      id,
      time_in,
      time_out,
      date
    FROM attendances 
    WHERE employee_id = ? AND date = CURDATE()
    LIMIT 1
  `;

  db.query(sql, [employee_id], (err, result) => {
    if (err) {
      console.error("Lỗi lấy attendance:", err);
      return res.status(500).json({ error: "Lỗi lấy attendance" });
    }

    if (result.length === 0) {
      return res.json({ 
        check_in: null, 
        check_out: null 
      });
    }

    const attendance = result[0];
    res.json({
      check_in: attendance.time_in ? new Date(attendance.time_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
      check_out: attendance.time_out ? new Date(attendance.time_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null,
      date: attendance.date
    });
  });
};

// Lấy lịch 7 ngày
export const getWeek = (req, res) => {
  const email = req.params.email;

  const sql = `
    SELECT 
      DATE(date) AS day_date,
      time_in,
      time_out
    FROM attendances a
    JOIN employees e ON a.employee_id = e.id
    WHERE e.email = ?
    ORDER BY date DESC
    LIMIT 7
  `;

  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi tải dữ liệu" });

    res.json(result);
  });
};