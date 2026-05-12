/**
 * Seeds an admin login and synthetic invoices + payments for revenue charts.
 * Run from repo: node backend/scripts/seed-revenue-demo.js
 * (or cd backend && node scripts/seed-revenue-demo.js)
 *
 * Default admin: admin@registration.local / Admin123!
 * Optional env: ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD
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

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

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
    await connection.beginTransaction();
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
    await connection.commit();
    // eslint-disable-next-line no-console
    console.log(`Admin upserted: ${ADMIN_EMAIL} (continuing with demo data…)`);

    await connection.beginTransaction();

    const [[{ maxPay }]] = await connection.query(
      "SELECT IFNULL(MAX(Payment_ID), 0) AS maxPay FROM Payments"
    );
    let nextPaymentId = Number(maxPay) + 1;

    const [[{ maxInv }]] = await connection.query(
      "SELECT IFNULL(MAX(Invoice_ID), 0) AS maxInv FROM Invoices"
    );
    let nextInvoiceId = Number(maxInv) + 1;

    const [students] = await connection.query(
      "SELECT Student_ID FROM Students ORDER BY Student_ID LIMIT 10"
    );
    if (!students.length) {
      throw new Error("No students in DB — run node add-course-data.js first.");
    }

    const targetNewInvoices = 28;
    for (let i = 0; i < targetNewInvoices; i++) {
      const stu = students[randInt(0, students.length - 1)];
      const sid = stu.Student_ID ?? stu.student_id;
      const total = randInt(400, 3200) + Math.random();
      const daysAgo = randInt(10, 200);
      const paid = Math.random() > 0.35;
      const status = paid ? "Paid" : Math.random() > 0.5 ? "Unpaid" : "Partially Paid";
      await connection.query(
        `
        INSERT INTO Invoices (Invoice_ID, Student_ID, Total_Amount, Due_Date, Status)
        VALUES (?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ?)
        `,
        [nextInvoiceId, sid, Number(total.toFixed(2)), daysAgo, status]
      );

      if (paid) {
        const parts = randInt(1, 3);
        let remaining = Number(total.toFixed(2));
        for (let p = 0; p < parts; p++) {
          const chunk =
            p === parts - 1
              ? remaining
              : Number((remaining * (0.3 + Math.random() * 0.5)).toFixed(2));
          remaining = Number((remaining - chunk).toFixed(2));
          const payDays = daysAgo - randInt(0, Math.min(60, daysAgo));
          await connection.query(
            `INSERT INTO Payments (Payment_ID, Invoice_ID, Amount, Date, Method) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?)`,
            [nextPaymentId++, nextInvoiceId, chunk, payDays, ["Card", "PayPal", "Aid"][randInt(0, 2)]]
          );
        }
      } else if (status === "Partially Paid") {
        const partial = Number((Number(total.toFixed(2)) * (0.2 + Math.random() * 0.5)).toFixed(2));
        await connection.query(
          `INSERT INTO Payments (Payment_ID, Invoice_ID, Amount, Date, Method) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'Card')`,
          [nextPaymentId++, nextInvoiceId, partial, randInt(5, 90)]
        );
      }

      nextInvoiceId += 1;
    }

    const extraPayments = 55;
    const [existingInvoices] = await connection.query(
      "SELECT Invoice_ID, Total_Amount FROM Invoices ORDER BY RAND() LIMIT 40"
    );
    for (let k = 0; k < extraPayments && existingInvoices.length; k++) {
      const inv = existingInvoices[randInt(0, existingInvoices.length - 1)];
      const iid = inv.Invoice_ID ?? inv.invoice_id;
      const amt = randInt(50, 400) + Math.random();
      const dayBack = randInt(0, 185);
      await connection.query(
        `INSERT INTO Payments (Payment_ID, Invoice_ID, Amount, Date, Method) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 'Card')`,
        [nextPaymentId++, iid, Number(amt.toFixed(2)), dayBack]
      );
    }

    const [enrRows] = await connection.query(
      "SELECT Enrollment_ID FROM Enrollments ORDER BY Enrollment_ID LIMIT 120"
    );
    for (const row of enrRows) {
      const eid = row.Enrollment_ID ?? row.enrollment_id;
      await connection.query(
        `UPDATE Enrollments SET Enrollment_date = DATE_SUB(NOW(), INTERVAL ? DAY) WHERE Enrollment_ID = ?`,
        [randInt(0, 200), eid]
      );
    }

    await connection.commit();
    // eslint-disable-next-line no-console
    console.log(`Seeded admin (${ADMIN_EMAIL}) and demo invoices/payments. Password: ${ADMIN_PASSWORD}`);
  } catch (e) {
    await connection.rollback();
    throw e;
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
