import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function addCourseData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "student_registration",
    port: Number(process.env.DB_PORT || 3306)
  });

  try {
    await connection.beginTransaction();

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

    await connection.commit();

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
