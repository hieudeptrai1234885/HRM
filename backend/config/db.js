import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config(); // load .env

// Cấu hình kết nối MySQL
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "hrm",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

console.log("🔌 Đang kết nối MySQL với cấu hình:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  password: dbConfig.password ? "***" : "(empty)",
});

// Sử dụng createPool để quản lý connection tốt hơn
const db = mysql.createPool(dbConfig);

// Test kết nối và kiểm tra database
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Lỗi kết nối MySQL:", err);
    console.error("Chi tiết lỗi:", {
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState,
    });
    
    if (err.code === "ER_BAD_DB_ERROR") {
      console.error(`⚠️ Database "${dbConfig.database}" không tồn tại. Vui lòng tạo database trước.`);
      console.error(`   Chạy: CREATE DATABASE ${dbConfig.database};`);
    } else if (err.code === "ECONNREFUSED") {
      console.error("⚠️ Không thể kết nối đến MySQL server. Kiểm tra MySQL có đang chạy không.");
    } else if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("⚠️ Sai thông tin đăng nhập MySQL. Kiểm tra lại DB_USER và DB_PASS trong .env");
    }
  } else {
    // Kiểm tra database hiện tại
    connection.query("SELECT DATABASE() as current_db", (err, results) => {
      if (err) {
        console.error("❌ Lỗi kiểm tra database:", err);
      } else {
        const currentDb = results[0]?.current_db;
        console.log(`✅ Kết nối MySQL thành công!`);
        console.log(`📊 Database hiện tại: "${currentDb}"`);
        
        if (currentDb !== dbConfig.database) {
          console.warn(`⚠️ Cảnh báo: Database hiện tại ("${currentDb}") khác với cấu hình ("${dbConfig.database}")`);
        }
        
        // Kiểm tra các bảng cần thiết
        connection.query(
          "SHOW TABLES LIKE 'shared_files'",
          (err, tables) => {
            if (err) {
              console.error("❌ Lỗi kiểm tra bảng:", err);
            } else if (tables.length === 0) {
              console.warn(`⚠️ Bảng "shared_files" chưa tồn tại trong database "${currentDb}"`);
              console.warn(`   Vui lòng chạy migration: backend/migrations/create_shared_files_tables.sql`);
            } else {
              console.log(`✅ Bảng "shared_files" đã tồn tại`);
            }
            connection.release();
          }
        );
      }
    });
  }
});

// Promisify để sử dụng async/await
const promisePool = db.promise();

export default db;
export { promisePool };
