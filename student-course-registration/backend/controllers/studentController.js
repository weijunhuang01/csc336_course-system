export async function getStudentSchedule(req, res) {
  const db = req.app.locals.db;
  const studentId = Number(req.params.studentId);

  if (!studentId) {
    return res.status(400).json({ error: "Valid studentId is required" });
  }

  try {
    const [rows] = await db.query(
      "SELECT * FROM View_Student_Schedules WHERE Student_ID = ?",
      [studentId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch schedule", details: error.message });
  }
}

export async function getStudentInvoices(req, res) {
  const db = req.app.locals.db;
  const studentId = Number(req.params.studentId);

  if (!studentId) {
    return res.status(400).json({ error: "Valid studentId is required" });
  }

  try {
    const [invoiceRows] = await db.query(
      `
      SELECT Invoice_ID, Student_ID, Total_Amount, Due_Date, Status
      FROM Invoices
      WHERE Student_ID = ?
      ORDER BY Invoice_ID DESC
      `,
      [studentId]
    );

    const [itemRows] = await db.query(
      `
      SELECT Item_ID, Invoice_ID, Enrollment_ID, Description, Price
      FROM Invoices_Items
      WHERE Invoice_ID IN (
        SELECT Invoice_ID FROM Invoices WHERE Student_ID = ?
      )
      ORDER BY Item_ID DESC
      `,
      [studentId]
    );

    return res.json({
      invoices: invoiceRows,
      invoiceItems: itemRows
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch invoices", details: error.message });
  }
}
