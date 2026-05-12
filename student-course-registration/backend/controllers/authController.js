import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function toUserPayload(row) {
  return {
    email: row.email,
    role: row.role,
    studentId:
      row.student_id != null ? String(row.student_id) : undefined,
    instructorId:
      row.instructor_id != null ? String(row.instructor_id) : undefined
  };
}

export async function registerAccount(req, res) {
  const db = req.app.locals.db;
  const normalizedEmail = normalizeEmail(req.body.email);
  const password = String(req.body.password ?? "");
  const role = String(req.body.role ?? "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      ok: false,
      message: "Email and password are required."
    });
  }
  if (password.length < 4) {
    return res.status(400).json({
      ok: false,
      message: "Password must be at least 4 characters."
    });
  }
  if (role !== "student" && role !== "instructor") {
    return res.status(400).json({
      ok: false,
      message: "Role must be student or instructor."
    });
  }

  let studentId = null;
  let instructorId = null;

  try {
    if (role === "student") {
      const sid = Number.parseInt(String(req.body.studentId ?? "").trim(), 10);
      if (!Number.isFinite(sid) || sid < 0) {
        return res.status(400).json({
          ok: false,
          message: "Valid student ID is required."
        });
      }
      const [stu] = await db.query(
        "SELECT Student_ID FROM Students WHERE Student_ID = ? LIMIT 1",
        [sid]
      );
      if (!stu.length) {
        return res.status(400).json({
          ok: false,
          message: `Student record not found for ID ${sid}. Use an ID that exists in the Students table (e.g. 101, 102, or 111 after running node add-course-data.js).`
        });
      }
      studentId = sid;
    } else {
      const iid = Number.parseInt(String(req.body.instructorId ?? "").trim(), 10);
      if (!Number.isFinite(iid) || iid < 0) {
        return res.status(400).json({
          ok: false,
          message: "Valid instructor ID is required."
        });
      }
      const [ins] = await db.query(
        "SELECT Instructor_ID FROM Instructors WHERE Instructor_ID = ? LIMIT 1",
        [iid]
      );
      if (!ins.length) {
        return res.status(400).json({
          ok: false,
          message: `Instructor record not found for ID ${iid}. Use an ID from the Instructors table (e.g. 501–505 after seeding).`
        });
      }
      instructorId = iid;
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.query(
      `INSERT INTO App_Accounts (Email, Password_Hash, Role, Student_ID, Instructor_ID)
       VALUES (?, ?, ?, ?, ?)`,
      [
        normalizedEmail,
        hash,
        role,
        role === "student" ? studentId : null,
        role === "instructor" ? instructorId : null
      ]
    );

    const [rows] = await db.query(
      `SELECT Email AS email, Role AS role, Student_ID AS student_id, Instructor_ID AS instructor_id
       FROM App_Accounts WHERE Email = ? LIMIT 1`,
      [normalizedEmail]
    );

    return res.status(201).json({
      ok: true,
      user: toUserPayload(rows[0])
    });
  } catch (error) {
    if (error.errno === 1062 || error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "An account with this email already exists."
      });
    }
    if (
      error.code === "ER_NO_SUCH_TABLE" ||
      String(error.message || "").includes("Unknown table")
    ) {
      return res.status(503).json({
        ok: false,
        message:
          "Account storage is not set up. Create the App_Accounts table (see database/schema.sql) or run node add-course-data.js, then restart the backend."
      });
    }
    // eslint-disable-next-line no-console
    console.error("[registerAccount]", error.code, error.message);
    return res.status(500).json({
      ok: false,
      message:
        "Registration could not be completed (database error). Check that MySQL is running and the backend .env matches your database."
    });
  }
}

export async function loginAccount(req, res) {
  const db = req.app.locals.db;
  const normalizedEmail = normalizeEmail(req.body.email);
  const password = String(req.body.password ?? "");

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      ok: false,
      message: "Email and password are required."
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT Email AS email, Role AS role, Student_ID AS student_id, Instructor_ID AS instructor_id,
              Password_Hash AS password_hash
       FROM App_Accounts WHERE Email = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (!rows.length) {
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password."
      });
    }

    const row = rows[0];
    const passwordOk = await bcrypt.compare(password, row.password_hash);
    if (!passwordOk) {
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password."
      });
    }

    if (row.role === "student" && row.student_id != null) {
      const [stu] = await db.query(
        "SELECT Student_ID FROM Students WHERE Student_ID = ? LIMIT 1",
        [row.student_id]
      );
      if (!stu.length) {
        return res.status(403).json({
          ok: false,
          message:
            "Your Student ID is no longer in the school database. Contact the registrar or re-register with a valid ID."
        });
      }
    }

    return res.json({
      ok: true,
      user: toUserPayload(row)
    });
  } catch (error) {
    if (
      error.code === "ER_NO_SUCH_TABLE" ||
      String(error.message || "").includes("Unknown table")
    ) {
      return res.status(503).json({
        ok: false,
        message:
          "Account storage is not set up. Create the App_Accounts table (see database/schema.sql) or run node add-course-data.js."
      });
    }
    // eslint-disable-next-line no-console
    console.error("[loginAccount]", error.code, error.message);
    return res.status(500).json({
      ok: false,
      message: "Sign-in could not be completed."
    });
  }
}
