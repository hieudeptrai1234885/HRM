import db from "../config/db.js";
import nodemailer from "nodemailer";

// gửi OTP
export const sendOTP = (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  // gửi mail
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}. It will expire in 2 minutes.`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.log("Mail error:", err);
      return res.status(500).json({ error: "Cannot send OTP email" });
    }

    db.query(
      "INSERT INTO otp_codes (email, otp_code, expires_at) VALUES (?, ?, ?)",
      [email, otp, expires],
      (err) => {
        if (err) return res.status(500).json({ error: "Database error" });

        return res.json({ message: "OTP sent successfully" });
      }
    );
  });
};

// verify OTP
export const verifyOTP = (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ error: "Email and OTP are required" });

  db.query(
    "SELECT * FROM otp_codes WHERE email = ? ORDER BY id DESC LIMIT 1",
    [email],
    (err, results) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (results.length === 0)
        return res.status(400).json({ error: "OTP not found" });

      const record = results[0];

      const inputOTP = otp.toString().trim();
      const dbOTP = record.otp_code.toString().trim();

      console.log("INPUT:", inputOTP);
      console.log("DB:", dbOTP);

      if (inputOTP !== dbOTP)
        return res.status(400).json({ error: "Cannot verify OTP" });

      if (new Date() > new Date(record.expires_at))
        return res.status(400).json({ error: "OTP expired" });

      // (Không bắt buộc) XÓA luôn OTP sau khi verify
      db.query("DELETE FROM otp_codes WHERE id = ?", [record.id]);

      return res.json({ success: true });
    }
  );
};
