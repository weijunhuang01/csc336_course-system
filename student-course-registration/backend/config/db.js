/**
 * Assumed pre-established MySQL pool/connection.
 * Replace this import/export with your own existing DB setup if needed.
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "student_registration",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true
});

export default db;
