/**
 * Creates or resets the portal admin account (no invoice/payment seeding).
 * Run: cd backend && node scripts/seed-admin-only.js
 *
 * Default: admin@registration.local / Admin123!
 * Override: ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const ADMIN_EMAIL =
  String(process.env.ADMIN_SEED_EMAIL || "admin@registration.local").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_SEED_PASSWORD || "Admin123!");

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME || "student_registration",
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await connection.query(
      `
      INSERT INTO App_Accounts (Email, Password_Hash, Role, Student_ID, Instructor_ID)
      VALUES (?, ?, 'admin', NULL, NULL)
      ON DUPLICATE KEY UPDATE
        Password_Hash = VALUES(Password_Hash),
        Role = 'admin',
        Student_ID = NULL,
        Instructor_ID = NULL
      `,
      [ADMIN_EMAIL, hash]
    );
    // eslint-disable-next-line no-console
    console.log(`Admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
