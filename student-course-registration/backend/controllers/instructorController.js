function parseNonNegInt(raw, label) {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: `${label} must be a non-negative integer.` };
  }
  return { ok: true, value: n };
}

/** Current enrolled count for a section (active enrollments). */
async function countEnrolled(connection, sectionId) {
  const [rows] = await connection.query(
    `
    SELECT COUNT(*) AS n
    FROM Enrollments
    WHERE Section_ID = ?
      AND (Status IS NULL OR LOWER(TRIM(Status)) = 'enrolled')
    `,
    [sectionId]
  );
  const n = rows[0]?.n ?? rows[0]?.N;
  return Number(n) || 0;
}

async function checkScheduleConflicts(connection, params) {
  const { instructorId, sectionId, semester, schedule, room } = params;

  const [instrConflict] = await connection.query(
    `
    SELECT Section_ID
    FROM Course_Sections
    WHERE Instructor_ID = ?
      AND Semester = ?
      AND Schedule = ?
      AND Section_ID <> ?
    LIMIT 1
    `,
    [instructorId, semester, schedule, sectionId]
  );
  if (instrConflict.length) {
    return {
      ok: false,
      code: "instructor_schedule_conflict",
      message: "You already teach another section at this day/time this semester.",
      conflictingSectionId: instrConflict[0].Section_ID
    };
  }

  const [roomConflict] = await connection.query(
    `
    SELECT Section_ID
    FROM Course_Sections
    WHERE Room = ?
      AND Semester = ?
      AND Schedule = ?
      AND Section_ID <> ?
    LIMIT 1
    `,
    [room, semester, schedule, sectionId]
  );
  if (roomConflict.length) {
    return {
      ok: false,
      code: "room_schedule_conflict",
      message: "Another section already uses this room at this day/time.",
      conflictingSectionId: roomConflict[0].Section_ID
    };
  }

  return { ok: true };
}

export async function createSection(req, res) {
  const db = req.app.locals.db;
  const { sectionId, courseId, instructorId, semester, capacity, room, schedule, openSeats } =
    req.body;

  if (!sectionId || !courseId || !instructorId || !semester || !capacity || !room || !schedule) {
    return res.status(400).json({
      error: "sectionId, courseId, instructorId, semester, capacity, room, and schedule are required"
    });
  }

  const normalizedOpenSeats = Number(openSeats ?? capacity);
  if (normalizedOpenSeats > Number(capacity)) {
    return res.status(400).json({ error: "openSeats cannot exceed capacity" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [courseRows] = await connection.query(
      "SELECT Course_ID FROM Courses WHERE Course_ID = ?",
      [courseId]
    );
    if (!courseRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Course not found" });
    }

    const [instructorRows] = await connection.query(
      "SELECT Instructor_ID FROM Instructors WHERE Instructor_ID = ?",
      [instructorId]
    );
    if (!instructorRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Instructor not found" });
    }

    const [instructorConflict] = await connection.query(
      `
      SELECT Section_ID
      FROM Course_Sections
      WHERE Instructor_ID = ? AND Semester = ? AND Schedule = ?
      LIMIT 1
      `,
      [instructorId, semester, schedule]
    );
    if (instructorConflict.length) {
      await connection.rollback();
      return res.status(409).json({
        error: "Instructor schedule conflict detected",
        conflictingSectionId: instructorConflict[0].Section_ID
      });
    }

    const [roomConflict] = await connection.query(
      `
      SELECT Section_ID
      FROM Course_Sections
      WHERE Room = ? AND Semester = ? AND Schedule = ?
      LIMIT 1
      `,
      [room, semester, schedule]
    );
    if (roomConflict.length) {
      await connection.rollback();
      return res.status(409).json({
        error: "Room schedule conflict detected",
        conflictingSectionId: roomConflict[0].Section_ID
      });
    }

    await connection.query(
      `
      INSERT INTO Course_Sections
      (Section_ID, Course_ID, Instructor_ID, Semester, Capacity, Open_Seats, Room, Schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sectionId,
        courseId,
        instructorId,
        semester,
        Number(capacity),
        normalizedOpenSeats,
        room,
        schedule
      ]
    );

    await connection.commit();
    return res.status(201).json({ message: "Section created successfully" });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ error: "Failed to create section", details: error.message });
  } finally {
    connection.release();
  }
}

/**
 * GET /api/instructor/:instructorId/sections
 * Lists all sections taught by this instructor (ownership enforced in SQL).
 */
export async function getInstructorSections(req, res) {
  const db = req.app.locals.db;
  const parsed = parseNonNegInt(req.params.instructorId, "instructorId");
  if (!parsed.ok) {
    return res.status(400).json({ ok: false, message: parsed.error });
  }
  const instructorId = parsed.value;

  const sql = `
    SELECT
      cs.Section_ID AS sectionId,
      cs.Course_ID AS courseId,
      c.Course_Name AS courseName,
      cs.Semester AS semester,
      cs.Schedule AS schedule,
      cs.Room AS room,
      cs.Capacity AS capacity,
      cs.Open_Seats AS openSeats,
      COALESCE(
        cs.Enrolled_Count,
        GREATEST(0, cs.Capacity - cs.Open_Seats)
      ) AS enrolledCount
    FROM Course_Sections cs
    INNER JOIN Courses c ON c.Course_ID = cs.Course_ID
    WHERE cs.Instructor_ID = ?
    ORDER BY cs.Semester, c.Course_ID, cs.Section_ID
  `;

  try {
    const [rows] = await db.query(sql, [instructorId]);
    return res.json({
      ok: true,
      sections: rows.map((row) => ({
        sectionId: row.sectionId,
        courseId: row.courseId,
        courseName: row.courseName,
        semester: row.semester,
        schedule: row.schedule,
        room: row.room,
        capacity: Number(row.capacity) || 0,
        openSeats: Number(row.openSeats) || 0,
        enrolledCount: Number(row.enrolledCount) || 0
      }))
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[getInstructorSections]", error.code || "", error.message);
    return res.status(500).json({
      ok: false,
      message: "Could not load sections.",
      details: error.message
    });
  }
}

/**
 * GET /api/instructor/:instructorId/sections/:sectionId/roster
 * Enrolled students for a section — only if the instructor teaches it.
 */
export async function getSectionRoster(req, res) {
  const db = req.app.locals.db;
  const pi = parseNonNegInt(req.params.instructorId, "instructorId");
  const ps = parseNonNegInt(req.params.sectionId, "sectionId");
  if (!pi.ok) return res.status(400).json({ ok: false, message: pi.error });
  if (!ps.ok) return res.status(400).json({ ok: false, message: ps.error });

  const instructorId = pi.value;
  const sectionId = ps.value;

  const sql = `
    SELECT
      s.Student_ID AS studentId,
      s.Name AS name
    FROM Enrollments e
    INNER JOIN Students s ON s.Student_ID = e.Student_ID
    WHERE e.Section_ID = ?
      AND (e.Status IS NULL OR LOWER(TRIM(e.Status)) = 'enrolled')
    ORDER BY s.Name ASC, s.Student_ID ASC
  `;

  try {
    const [owns] = await db.query(
      `SELECT Section_ID FROM Course_Sections WHERE Section_ID = ? AND Instructor_ID = ? LIMIT 1`,
      [sectionId, instructorId]
    );
    if (!owns.length) {
      return res.status(404).json({
        ok: false,
        message: "Section not found or not assigned to this instructor."
      });
    }

    const [rows] = await db.query(sql, [sectionId]);

    return res.json({
      ok: true,
      sectionId,
      students: rows.map((r) => ({
        studentId: r.studentId,
        name: r.name ?? ""
      }))
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[getSectionRoster]", error.code || "", error.message);
    return res.status(500).json({
      ok: false,
      message: "Could not load roster.",
      details: error.message
    });
  }
}

/**
 * PATCH /api/instructor/:instructorId/sections/:sectionId
 * Body: { capacity?: number, schedule?: string, room?: string }
 */
export async function updateInstructorSection(req, res) {
  const db = req.app.locals.db;
  const pi = parseNonNegInt(req.params.instructorId, "instructorId");
  const ps = parseNonNegInt(req.params.sectionId, "sectionId");
  if (!pi.ok) return res.status(400).json({ ok: false, message: pi.error });
  if (!ps.ok) return res.status(400).json({ ok: false, message: ps.error });

  const instructorId = pi.value;
  const sectionId = ps.value;

  const { capacity, schedule, room } = req.body ?? {};
  const hasCapacity = capacity !== undefined && capacity !== null && String(capacity).trim() !== "";
  const hasSchedule =
    schedule !== undefined && schedule !== null && String(schedule).trim() !== "";
  const hasRoom = room !== undefined && room !== null && String(room).trim() !== "";

  if (!hasCapacity && !hasSchedule && !hasRoom) {
    return res.status(400).json({
      ok: false,
      message: "Provide at least one of: capacity, schedule, room."
    });
  }

  let newCapacity;
  if (hasCapacity) {
    const cap = Number.parseInt(String(capacity).trim(), 10);
    if (!Number.isFinite(cap) || cap < 1) {
      return res.status(400).json({
        ok: false,
        message: "capacity must be a positive integer."
      });
    }
    newCapacity = cap;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [secRows] = await connection.query(
      `
      SELECT Section_ID, Course_ID, Instructor_ID, Semester, Capacity, Open_Seats, Room, Schedule,
             COALESCE(Enrolled_Count, GREATEST(0, Capacity - Open_Seats)) AS enrolled_count
      FROM Course_Sections
      WHERE Section_ID = ?
        AND Instructor_ID = ?
      FOR UPDATE
      `,
      [sectionId, instructorId]
    );

    if (!secRows.length) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        message: "Section not found or not assigned to this instructor."
      });
    }

    const row = secRows[0];
    const enrolled = Number(row.enrolled_count) || (await countEnrolled(connection, sectionId));

    let nextCapacity = Number(row.Capacity) || 0;
    let nextSchedule = String(row.Schedule ?? "");
    let nextRoom = String(row.Room ?? "");
    const semester = String(row.Semester ?? "");

    if (hasCapacity) {
      if (newCapacity < enrolled) {
        await connection.rollback();
        return res.status(400).json({
          ok: false,
          message: `Capacity cannot be less than current enrollment (${enrolled} students).`
        });
      }
      nextCapacity = newCapacity;
    }

    if (hasSchedule) {
      nextSchedule = String(schedule).trim();
    }
    if (hasRoom) {
      nextRoom = String(room).trim();
    }

    if (hasSchedule || hasRoom) {
      const conflict = await checkScheduleConflicts(connection, {
        instructorId,
        sectionId,
        semester,
        schedule: nextSchedule,
        room: nextRoom
      });
      if (!conflict.ok) {
        await connection.rollback();
        return res.status(409).json({
          ok: false,
          ...conflict
        });
      }
    }

    const openSeats = Math.max(0, nextCapacity - enrolled);

    await connection.query(
      `
      UPDATE Course_Sections
      SET
        Capacity = ?,
        Open_Seats = ?,
        Enrolled_Count = ?,
        Schedule = ?,
        Room = ?
      WHERE Section_ID = ?
        AND Instructor_ID = ?
      `,
      [nextCapacity, openSeats, enrolled, nextSchedule, nextRoom, sectionId, instructorId]
    );

    await connection.commit();

    return res.json({
      ok: true,
      section: {
        sectionId,
        capacity: nextCapacity,
        openSeats,
        enrolledCount: enrolled,
        schedule: nextSchedule,
        room: nextRoom,
        semester
      }
    });
  } catch (error) {
    await connection.rollback();
    // eslint-disable-next-line no-console
    console.error("[updateInstructorSection]", error.code || "", error.message);
    return res.status(500).json({
      ok: false,
      message: "Could not update section.",
      details: error.message
    });
  } finally {
    connection.release();
  }
}
