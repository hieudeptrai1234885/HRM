import db from "../config/db.js";

// =============================
// KIỂM TRA KHUÔN MẶT
// =============================
export const matchFace = (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).json({ error: "Thiếu email" });

    const sql = "SELECT id, full_name, email FROM employees WHERE email = ?";
    db.query(sql, [email], (err, result) => {
        if (err) {
            console.log("DB ERROR:", err);
            return res.status(500).json({ error: "Lỗi database" });
        }

        if (result.length === 0) {
            return res.status(400).json({ error: "Không tìm thấy nhân viên" });
        }

        res.json({ success: true, employee: result[0] });
    });
};

// =============================
// CHECK-IN THỦ CÔNG (NẾU DÙNG NÚT)
// =============================
export const checkIn = (req, res) => {
    const { employee_id, name } = req.body;

    const sql = `
        INSERT INTO attendances (employee_id, name, check_in, date, created_at)
        VALUES (?, ?, NOW(), CURDATE(), NOW())
    `;

    db.query(sql, [employee_id, name], (err, result) => {
        if (err) {
            console.log("DB ERROR:", err);
            return res.status(500).json({ error: "Lỗi lưu điểm danh" });
        }

        res.json({ success: true, message: "Check-in thành công" });
    });
};

// =============================
// CHECK-IN HOẶC CHECK-OUT TỰ ĐỘNG
// =============================
export const checkInOrOut = (req, res) => {
    const { employee_id } = req.body;
    if (!employee_id) return res.status(400).json({ error: "Thiếu employee_id" });

    const findToday = `
        SELECT * FROM attendances
        WHERE employee_id = ? AND date = CURDATE()
        LIMIT 1
    `;

    db.query(findToday, [employee_id], (err, rows) => {
        if (err) {
            console.log("DB ERROR:", err);
            return res.status(500).json({ error: "Lỗi database" });
        }

        // Chưa có bản ghi hôm nay → CHECK IN
        if (rows.length === 0) {
            const insert = `
                INSERT INTO attendances (employee_id, check_in, date, created_at)
                VALUES (?, NOW(), CURDATE(), NOW())
            `;
            db.query(insert, [employee_id], (err2) => {
                if (err2) {
                    console.log("DB ERROR:", err2);
                    return res.status(500).json({ error: "Lỗi lưu check-in" });
                }
                return res.json({ success: true, type: "check_in", message: "Check-in thành công!" });
            });
        }

        // Đã có bản ghi → xử lý CHECK OUT
        else {
            const record = rows[0];

            if (record.check_out) {
                return res.json({
                    success: true,
                    type: "done",
                    message: "Hôm nay bạn đã check-out rồi!"
                });
            }

            const update = `
                UPDATE attendances
                SET check_out = NOW()
                WHERE id = ?
            `;

            db.query(update, [record.id], (err3) => {
                if (err3) {
                    console.log("DB ERROR:", err3);
                    return res.status(500).json({ error: "Lỗi lưu check-out" });
                }

                res.json({ success: true, type: "check_out", message: "Check-out thành công!" });
            });
        }
    });
};

// =============================
// API LẤY LỊCH LÀM 7 NGÀY
// =============================
export const getWeekAttendance = (req, res) => {
    const email = req.params.email;

    const findEmp = "SELECT id FROM employees WHERE email = ?";
    db.query(findEmp, [email], (err, empRows) => {
        if (err) return res.status(500).json({ error: "Lỗi database" });
        if (empRows.length === 0) return res.status(400).json({ error: "Không tìm thấy nhân viên" });

        const employee_id = empRows[0].id;

        const sql = `
            SELECT 
                date,
                DATE_FORMAT(check_in, '%H:%i') AS check_in,
                DATE_FORMAT(check_out, '%H:%i') AS check_out
            FROM attendances
            WHERE employee_id = ?
            ORDER BY date DESC
            LIMIT 7
        `;

        db.query(sql, [employee_id], (err2, rows) => {
            if (err2) return res.status(500).json({ error: "Lỗi lấy dữ liệu" });

            res.json(rows);
        });
    });
};
