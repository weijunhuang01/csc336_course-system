import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function runDbTest() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "student_registration",
      port: Number(process.env.DB_PORT || 3306)
    });

    // 1) Call stored procedure: RegisterStudent(studentId, sectionId)
    await connection.query("CALL RegisterStudent(?, ?)", [101, 901]);
    // eslint-disable-next-line no-console
    console.log("RegisterStudent(101, 901) executed.");

    // 2) Query view and print student 101 schedule
    const [scheduleRows] = await connection.query(
      "SELECT * FROM View_Student_Schedules WHERE Student_ID = ?",
      [101]
    );

    // eslint-disable-next-line no-console
    console.log("View_Student_Schedules result for Student_ID = 101:");
    // eslint-disable-next-line no-console
    console.table(scheduleRows);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Database test failed:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runDbTest();
