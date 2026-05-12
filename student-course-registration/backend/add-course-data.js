import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

/**
 * Remove duplicate (Student_ID, Section_ID) rows, fix section seat counts,
 * add UNIQUE(Student_ID, Section_ID) when missing.
 */
async function migrateEnrollmentUniqueness(connection) {
  const ignoreDupIndexName = (err) => {
    const msg = String(err?.message || "");
    const code = err?.code;
    return code === "ER_DUP_KEYNAME" || /Duplicate key name/i.test(msg);
  };

  try {
    await connection.query(`DROP TEMPORARY TABLE IF EXISTS scr_enrollment_dupes`);

    await connection.query(`
      CREATE TEMPORARY TABLE scr_enrollment_dupes AS
      SELECT e.Enrollment_ID
      FROM Enrollments e
      INNER JOIN (
        SELECT Student_ID, Section_ID, MIN(Enrollment_ID) AS keep_id
        FROM Enrollments
        GROUP BY Student_ID, Section_ID
      ) x ON x.Student_ID = e.Student_ID
         AND x.Section_ID = e.Section_ID
         AND e.Enrollment_ID <> x.keep_id
    `);

    await connection.query(`
      DELETE ii FROM Invoices_Items ii
      INNER JOIN scr_enrollment_dupes d ON d.Enrollment_ID = ii.Enrollment_ID
    `);

    await connection.query(`
      DELETE e FROM Enrollments e
      INNER JOIN scr_enrollment_dupes d ON d.Enrollment_ID = e.Enrollment_ID
    `);

    await connection.query(`DROP TEMPORARY TABLE IF EXISTS scr_enrollment_dupes`);

    await connection.query(`
      UPDATE Course_Sections cs
      LEFT JOIN (
        SELECT Section_ID, COUNT(*) AS cnt
        FROM Enrollments
        GROUP BY Section_ID
      ) x ON x.Section_ID = cs.Section_ID
      SET
        cs.Enrolled_Count = COALESCE(x.cnt, 0),
        cs.Open_Seats = GREATEST(0, cs.Capacity - COALESCE(x.cnt, 0))
    `);

    await connection
      .query(
        "ALTER TABLE Enrollments ADD UNIQUE KEY uk_enrollments_student_section (Student_ID, Section_ID)"
      )
      .catch((err) => {
        if (ignoreDupIndexName(err)) return;
        throw err;
      });
  } catch (err) {
    if (ignoreDupIndexName(err)) return;
    // eslint-disable-next-line no-console
    console.warn("[migrateEnrollmentUniqueness]", err.message);
  }
}

async function addCourseData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "Lwz1102970654",
    database: process.env.DB_NAME || "student_registration",
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    await connection.beginTransaction();

    await connection
      .query(
        "ALTER TABLE Course_Sections MODIFY COLUMN Semester VARCHAR(32) NULL"
      )
      .catch(() => {});

    await connection
      .query(
        "ALTER TABLE Students ADD COLUMN Account_Payment_Status VARCHAR(20) NOT NULL DEFAULT 'Unpaid'"
      )
      .catch((e) => {
        if (!/Duplicate column name/i.test(String(e.message))) throw e;
      });

    await connection
      .query(
        "ALTER TABLE Course_Sections ADD COLUMN Enrolled_Count INT NOT NULL DEFAULT 0"
      )
      .catch((e) => {
        if (!/Duplicate column name/i.test(String(e.message))) throw e;
      });

    await connection.query(`
      INSERT INTO Department (Department_ID, Name)
      VALUES
        (1, 'Computer Science'),
        (2, 'Mathematics'),
        (3, 'Physics'),
        (4, 'Business')
      ON DUPLICATE KEY UPDATE Name = VALUES(Name)
    `);

    await connection.query(`
      INSERT INTO Students (Student_ID, Name, Department_ID, Phone, Email, Total_Credits_Earned)
      VALUES
        (101, 'Demo Student', 1, '000-0000', 'test@gmail.com', 0),
        (102, 'Demo Student Two', 1, '000-0001', 'demo2@example.com', 0),
        (111, 'Demo Student Three', 1, '000-0002', 'demo111@example.com', 0)
      ON DUPLICATE KEY UPDATE
        Name = VALUES(Name),
        Department_ID = VALUES(Department_ID),
        Phone = VALUES(Phone),
        Email = VALUES(Email),
        Total_Credits_Earned = VALUES(Total_Credits_Earned)
    `);

    await connection.query(`
      INSERT INTO Instructors (Instructor_ID, Name, Department_ID, Email)
      VALUES
        (501, 'Dr. Smith', 1, 'smith@ccny.edu'),
        (502, 'Dr. Rivera', 1, 'rivera@ccny.edu'),
        (503, 'Prof. Lee', 2, 'lee@ccny.edu'),
        (504, 'Dr. Khan', 3, 'khan@ccny.edu'),
        (505, 'Prof. Patel', 4, 'patel@ccny.edu')
      ON DUPLICATE KEY UPDATE
        Name = VALUES(Name),
        Department_ID = VALUES(Department_ID),
        Email = VALUES(Email)
    `);

    await connection.query(`
      INSERT INTO Courses (Course_ID, Course_Name, Credits, Department_ID, Base_Cost)
      VALUES
        (201, 'Modern Distributed Computing', 3, 1, 1200.00),
        (202, 'Database Systems', 3, 1, 1150.00),
        (203, 'Software Engineering', 3, 1, 1100.00),
        (204, 'Linear Algebra', 3, 2, 900.00),
        (205, 'Calculus II', 4, 2, 950.00),
        (206, 'Physics I', 4, 3, 980.00),
        (207, 'Marketing Fundamentals', 3, 4, 1050.00)
      ON DUPLICATE KEY UPDATE
        Course_Name = VALUES(Course_Name),
        Credits = VALUES(Credits),
        Department_ID = VALUES(Department_ID),
        Base_Cost = VALUES(Base_Cost)
    `);

    await connection.query(`
      INSERT INTO Course_Sections
      (Section_ID, Course_ID, Instructor_ID, Semester, Capacity, Room, Schedule, Open_Seats)
      VALUES
        (901, 201, 501, 'Spring 2026', 30, 'NAC 1/201', 'MW 2:00PM', 24),
        (902, 202, 502, 'Spring 2026', 35, 'NAC 2/101', 'TuTh 11:00AM', 35),
        (903, 203, 502, 'Spring 2026', 40, 'NAC 2/205', 'MW 10:00AM', 38),
        (904, 204, 503, 'Spring 2026', 30, 'MR 1/301', 'TuTh 1:00PM', 29),
        (905, 205, 503, 'Spring 2026', 28, 'MR 1/210', 'MWF 9:00AM', 28),
        (906, 206, 504, 'Spring 2026', 32, 'PH 3/110', 'TuTh 3:00PM', 32),
        (907, 207, 505, 'Spring 2026', 36, 'BIZ 2/220', 'F 1:00PM', 36),
        (908, 202, 501, 'Fall 2026', 35, 'NAC 2/102', 'MW 4:00PM', 35),
        (909, 204, 503, 'Fall 2026', 30, 'MR 1/305', 'TuTh 9:30AM', 30)
      ON DUPLICATE KEY UPDATE
        Course_ID = VALUES(Course_ID),
        Instructor_ID = VALUES(Instructor_ID),
        Semester = VALUES(Semester),
        Capacity = VALUES(Capacity),
        Room = VALUES(Room),
        Schedule = VALUES(Schedule),
        Open_Seats = VALUES(Open_Seats)
    `);

    await connection.query(`
      UPDATE Course_Sections
      SET Enrolled_Count = GREATEST(0, Capacity - Open_Seats)
    `);

    await connection.commit();

    await migrateEnrollmentUniqueness(connection);

    await connection
      .query(
        `
      CREATE TABLE IF NOT EXISTS App_Accounts (
        Account_ID INT AUTO_INCREMENT PRIMARY KEY,
        Email VARCHAR(255) NOT NULL,
        Password_Hash VARCHAR(255) NOT NULL,
        Role VARCHAR(20) NOT NULL,
        Student_ID INT NULL,
        Instructor_ID INT NULL,
        Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_app_accounts_email (Email),
        CONSTRAINT fk_app_accounts_student
          FOREIGN KEY (Student_ID) REFERENCES Students(Student_ID)
          ON DELETE CASCADE,
        CONSTRAINT fk_app_accounts_instructor
          FOREIGN KEY (Instructor_ID) REFERENCES Instructors(Instructor_ID)
          ON DELETE CASCADE
      )
    `
      )
      .catch(() => {});

    const [rows] = await connection.query(`
      SELECT c.Course_ID, c.Course_Name, cs.Section_ID, cs.Semester, cs.Open_Seats
      FROM Courses c
      LEFT JOIN Course_Sections cs ON c.Course_ID = cs.Course_ID
      ORDER BY c.Course_ID, cs.Section_ID
    `);

    // eslint-disable-next-line no-console
    console.table(rows);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

addCourseData().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to add course data:", error.message);
  process.exit(1);
});
