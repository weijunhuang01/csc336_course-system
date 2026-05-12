/**
 * MySQL pool. Loads `backend/.env` by path so the app works even when
 * `process.cwd()` is not the `backend/` folder (fixes missing DB_* env → 500s).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function envStr(key, fallback = "") {
  const v = process.env[key];
  if (v == null || v === "") return fallback;
  return String(v).trim();
}

const db = mysql.createPool({
  host: envStr("DB_HOST", "localhost"),
  user: envStr("DB_USER", "root"),
  password: envStr("DB_PASSWORD", ""),
  database: envStr("DB_NAME", "student_registration"),
  port: Number(envStr("DB_PORT", "3306")) || 3306,
  waitForConnections: true
});

export default db;
