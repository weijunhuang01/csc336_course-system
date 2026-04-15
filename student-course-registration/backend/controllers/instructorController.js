export async function createSection(req, res) {
  const db = req.app.locals.db;
  const { sectionId, courseId, instructorId, semester, capacity, room, schedule, openSeats } = req.body;

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
      [sectionId, courseId, instructorId, semester, Number(capacity), normalizedOpenSeats, room, schedule]
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
