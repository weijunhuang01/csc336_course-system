export async function getEnrollmentsForStudent(req, res) {
  const db = req.app.locals.db;
  const raw = req.params.studentId;

  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Student ID is required"
    });
  }

  const studentId = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(studentId) || studentId < 0) {
    return res.status(400).json({
      success: false,
      message: "Student ID must be a non-negative integer"
    });
  }

  const sql = [
    "SELECT",
    "  e.Enrollment_ID,",
    "  e.Section_ID,",
    "  e.`Status`,",
    "  c.Course_ID,",
    "  c.Course_Name,",
    "  c.Credits,",
    "  c.Base_Cost,",
    "  cs.Semester,",
    "  cs.`Schedule`,",
    "  cs.Room,",
    "  cs.Capacity,",
    "  cs.Open_Seats,",
    "  COALESCE(cs.Enrolled_Count, GREATEST(0, cs.Capacity - cs.Open_Seats)) AS Enrolled_Count",
    "FROM Enrollments e",
    "INNER JOIN (",
    "  SELECT Student_ID, Section_ID, MAX(Enrollment_ID) AS Pick_Enrollment_ID",
    "  FROM Enrollments",
    "  WHERE Student_ID = ?",
    "  GROUP BY Student_ID, Section_ID",
    ") dedupe ON dedupe.Pick_Enrollment_ID = e.Enrollment_ID",
    "INNER JOIN Course_Sections cs ON cs.Section_ID = e.Section_ID",
    "INNER JOIN Courses c ON c.Course_ID = cs.Course_ID",
    "WHERE e.Student_ID = ?",
    "ORDER BY c.Course_ID, e.Section_ID"
  ].join("\n");

  try {
    const [rows] = await db.query(sql, [studentId, studentId]);

    return res.json(rows);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[getEnrollmentsForStudent]", error.code || "", error.message);
    return res.status(500).json({
      success: false,
      error: "Unable to load enrollments",
      details: error.message || String(error),
      code: error.code
    });
  }
}

export async function enrollStudent(req, res) {
  const db = req.app.locals.db;

  const { studentId, sectionId } = req.body;

  const sid = Number.parseInt(String(studentId ?? "").trim(), 10);
  const secId = Number.parseInt(String(sectionId ?? "").trim(), 10);

  if (!Number.isFinite(sid) || !Number.isFinite(secId)) {
    return res.status(400).json({
      success: false,
      message: "studentId and sectionId must be valid integers."
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    
    const [studentRows] = await connection.query(
      "SELECT Student_ID FROM Students WHERE Student_ID = ? LIMIT 1",
      [sid]
    );
    
    if (studentRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message:
          "Student record not found. Your Student ID must exist in the Students table (registrar data). Run node add-course-data.js for demo IDs, or ask an admin to add your profile."
      });
    }

    const [sectionRows] = await connection.query(
      "SELECT Section_ID FROM Course_Sections WHERE Section_ID = ? LIMIT 1",
      [secId]
    );
    
    if (sectionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Section not found"
      });
    }
    
    const [spResult] = await connection.query("CALL RegisterStudent(?, ?)", [sid, secId]);
    const messageRow = spResult[0];

    if (messageRow && messageRow.length > 0) {
      const message = messageRow[0].Message;
      if (message === 'Registration Failed: Class Full') {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: "This section is full (no open seats). Choose another section or wait until seats open."
        });
      } else if (message === 'Registration Successful') {
        // Update student payment status after successful registration.
        // This is not handled by the stored procedure, so we keep it here.
        await connection.query(
          `UPDATE Students SET Account_Payment_Status = 'Unpaid' WHERE Student_ID = ?`,
          [sid]
        );
        await connection.commit();
        return res.status(201).json({
          success: true,
          waitlisted: false,
          message: "Enrollment successful"
        });
      } else {
        // Unexpected message from SP
        await connection.rollback();
        return res.status(500).json({
          success: false,
          message: `Enrollment failed: Unexpected message from stored procedure: ${message}`
        });
      }
    } else {
      // SP did not return expected message
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: "This section just filled up. Try again or pick another section."
      });
    }

  } catch (error) {
    await connection.rollback();
    const errno = error.errno;
    const code = error.code;

    if (errno === 1062 || code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this section."
      });
    }

    if (
      errno === 1452 ||
      code === "ER_NO_REFERENCED_2" ||
      code === "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Student record not found, or the section is not valid for enrollment. Confirm your Student ID exists in Students and the section exists in Course_Sections."
      });
    }

    // eslint-disable-next-line no-console
    console.error("[enrollStudent]", code || "", error.message);

    return res.status(500).json({
      success: false,
      message: "Enrollment could not be completed. Please try again later.",
      code
    });
  } finally {
    connection.release();
  }
}

export async function dropStudent(req, res) {
  const db = req.app.locals.db;

  const { studentId, sectionId } = req.body;

  const sid = Number.parseInt(String(studentId ?? "").trim(), 10);
  const secId = Number.parseInt(String(sectionId ?? "").trim(), 10);

  if (!Number.isFinite(sid) || !Number.isFinite(secId)) {
    return res.status(400).json({
      success: false,
      message: "studentId and sectionId must be valid integers."
    });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT Enrollment_ID
      FROM Enrollments
      WHERE Student_ID = ?
      AND Section_ID = ?
      FOR UPDATE
      `,
      [sid, secId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Enrollment not found"
      });
    }

    const droppedCount = rows.length;

    for (const row of rows) {
      const enrollmentId = row.Enrollment_ID ?? row.enrollment_id;

      const [invoiceLines] = await connection.query(
        `
        SELECT Invoice_ID, COALESCE(Price, 0) AS Price
        FROM Invoices_Items
        WHERE Enrollment_ID = ?
        `,
        [enrollmentId]
      );

      for (const line of invoiceLines) {
        const invoiceId = line.Invoice_ID ?? line.invoice_id;
        const price = Number(line.Price ?? line.price ?? 0) || 0;
        if (invoiceId != null) {
          await connection.query(
            `
            UPDATE Invoices
            SET Total_Amount = GREATEST(0, COALESCE(Total_Amount, 0) - ?)
            WHERE Invoice_ID = ?
            `,
            [price, invoiceId]
          );
        }
      }

      await connection.query(`DELETE FROM Invoices_Items WHERE Enrollment_ID = ?`, [
        enrollmentId
      ]);
    }

    await connection.query(
      `
      DELETE FROM Enrollments
      WHERE Student_ID = ?
      AND Section_ID = ?
      `,
      [sid, secId]
    );

    await connection.query(
      `
      UPDATE Course_Sections
      SET Open_Seats = Open_Seats + ?
      WHERE Section_ID = ?
      `,
      [droppedCount, secId]
    );

    await connection.query(
      `
      UPDATE Course_Sections
      SET Enrolled_Count = GREATEST(0, Capacity - Open_Seats)
      WHERE Section_ID = ?
      `,
      [secId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Course dropped successfully"
    });
  } catch (error) {
    await connection.rollback();
    const errno = error.errno;
    const code = error.code;
    // eslint-disable-next-line no-console
    console.error("[dropStudent]", code || "", error.message);

    if (errno === 1451 || code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message:
          "This enrollment is still linked to billing records. Contact support or remove related invoice lines first."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not drop the course. Please try again.",
      details: error.message
    });
  } finally {
    connection.release();
  }
}
