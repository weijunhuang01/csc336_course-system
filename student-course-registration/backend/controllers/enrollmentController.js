
export async function enrollStudent(req, res) {
  const db = req.app.locals.db;
  const { studentId, sectionId } = req.body;

  if (!studentId || !sectionId) {
    return res.status(400).json({ error: "studentId and sectionId are required" });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [studentRows] = await connection.query(
      "SELECT Student_ID FROM Students WHERE Student_ID = ?",
      [studentId]
    );
    if (!studentRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Student not found" });
    }

    const [enrollmentRows] = await connection.query(
      "SELECT Enrollment_ID, Status FROM Enrollments WHERE Student_ID = ? AND Section_ID = ? FOR UPDATE",
      [studentId, sectionId]
    );
    if (enrollmentRows.length && enrollmentRows[0].Status === "Enrolled") {
      await connection.rollback();
      return res.status(200).json({ message: "Student already enrolled" });
    }

    const [sectionRows] = await connection.query(
      "SELECT Open_Seats FROM Course_Sections WHERE Section_ID = ? FOR UPDATE",
      [sectionId]
    );
    if (!sectionRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Section not found" });
    }

    const availableSeats = Number(sectionRows[0].Open_Seats);
    if (availableSeats > 0) {
      if (enrollmentRows.length) {
        await connection.query(
          "UPDATE Enrollments SET Status = 'Enrolled' WHERE Enrollment_ID = ?",
          [enrollmentRows[0].Enrollment_ID]
        );
      } else {
        await connection.query(
          "INSERT INTO Enrollments (Student_ID, Section_ID, Status) VALUES (?, ?, 'Enrolled')",
          [studentId, sectionId]
        );
      }

      await connection.query(
        "UPDATE Course_Sections SET Open_Seats = Open_Seats - 1 WHERE Section_ID = ?",
        [sectionId]
      );
      await connection.commit();
      return res.status(201).json({ message: "Enrollment successful" });
    }
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ error: "Enrollment failed", details: error.message });
  } finally {
    connection.release();
  }
}

export async function updateEnrollmentStatus(req, res) {
  const db = req.app.locals.db;
  const { studentId, sectionId, status } = req.body;

  if (!studentId || !sectionId || !status) {
    return res.status(400).json({ error: "studentId, sectionId, and status are required" });
  }
  if (!["Enrolled", "Dropped"].includes(status)) {
    return res.status(400).json({ error: "status must be Enrolled or Dropped" });
  }

  try {
    const [result] = await db.query(
      "UPDATE Enrollments SET Status = ? WHERE Student_ID = ? AND Section_ID = ?",
      [status, studentId, sectionId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Enrollment not found" });
    }
    return res.status(200).json({ message: "Enrollment status updated" });
  } catch (error) {
    return res.status(500).json({ error: "Status update failed", details: error.message });
  }
}
