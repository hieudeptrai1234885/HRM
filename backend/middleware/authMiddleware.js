// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Không có token" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // để controller dùng
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
};
