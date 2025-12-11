import db from "../config/db.js";

export const getUserProfile = (req, res) => {
  const { email } = req.params;

  const sql = `
      SELECT e.full_name, e.department, e.position, e.phone, e.address, u.email
      FROM users u
      LEFT JOIN employees e ON u.email = e.email
      WHERE u.email = ?
  `;

  db.query(sql, [email], (err, result) => {
    if (err) {
      console.log("DB ERROR:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result[0]);
  });
};
