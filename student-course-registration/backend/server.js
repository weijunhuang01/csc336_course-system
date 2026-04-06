import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "student_registration",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true
});

app.get("/courses", async (req, res) => {
  try {
    const keyword = (req.query.keyword || "").toString().trim();
    const [rows] = await pool.query(
      `
      SELECT
        cs.Section_ID,
        c.Course_ID,
        c.Course_Name,
        c.Department,
        cs.Capacity,
        cs.Open_Seats,
        i.Name AS Instructor_Name
      FROM Course_Sections cs
      JOIN Courses c ON c.Course_ID = cs.Course_ID
      JOIN Instructors i ON i.Instructor_ID = cs.Instructor_ID
      WHERE (? = '' OR c.Course_Name LIKE ? OR c.Course_ID LIKE ? OR c.Department LIKE ?)
      ORDER BY c.Course_ID, cs.Section_ID
      `,
      [keyword, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch courses", details: error.message });
  }
});

app.post("/enroll", async (req, res) => {
  const { studentId, sectionId } = req.body;
  if (!studentId || !sectionId) {
    return res.status(400).json({ error: "studentId and sectionId are required" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [sectionRows] = await connection.query(
      "SELECT Open_Seats FROM Course_Sections WHERE Section_ID = ? FOR UPDATE",
      [sectionId]
    );

    if (!sectionRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Section not found" });
    }

    if (Number(sectionRows[0].Open_Seats) > 0) {
      await connection.query(
        "INSERT INTO Enrollments (Student_ID, Section_ID, Status) VALUES (?, ?, 'Enrolled')",
        [studentId, sectionId]
      );
      await connection.query(
        "UPDATE Course_Sections SET Open_Seats = Open_Seats - 1 WHERE Section_ID = ?",
        [sectionId]
      );
      await connection.commit();
      return res.status(201).json({ message: "Enrollment successful" });
    }

    const [positionRows] = await connection.query(
      "SELECT COALESCE(MAX(Position), 0) + 1 AS nextPosition FROM Waitlist WHERE Section_ID = ? FOR UPDATE",
      [sectionId]
    );
    const position = Number(positionRows[0].nextPosition);
    await connection.query(
      "INSERT INTO Waitlist (Student_ID, Section_ID, Position) VALUES (?, ?, ?)",
      [studentId, sectionId, position]
    );

    await connection.commit();
    return res.status(200).json({
      message: "Class is full. Added to waitlist.",
      position
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ error: "Enrollment failed", details: error.message });
  } finally {
    connection.release();
  }
});

const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${PORT}`);
});
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(500).json({ status: "db_error", details: error.message });
  }
});

app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${port}`);
});
