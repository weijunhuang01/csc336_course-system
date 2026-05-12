import db from "../config/db.js";

/** Ensures registrar portal payment flag exists (older DBs may lack this column). */
export async function ensureStudentsAccountPaymentColumn(pool) {
  try {
    await pool.query(
      "ALTER TABLE Students ADD COLUMN Account_Payment_Status VARCHAR(20) NOT NULL DEFAULT 'Unpaid'"
    );
  } catch (error) {
    if (!/Duplicate column name/i.test(String(error.message))) {
      throw error;
    }
  }
}

function normalizePaymentStatusFromRow(row) {
  const raw = row.Account_Payment_Status ?? row.account_payment_status;
  const s = String(raw ?? "Unpaid").trim();
  return s.toLowerCase() === "paid" ? "Paid" : s || "Unpaid";
}

export async function checkStudentExists(req, res) {
  const raw = req.params.studentId;
  const sid = Number.parseInt(String(raw ?? "").trim(), 10);

  if (!Number.isFinite(sid) || sid < 0) {
    return res.status(400).json({
      exists: false,
      message: "Invalid student ID."
    });
  }

  try {
    const [rows] = await db.query(
      "SELECT Student_ID FROM Students WHERE Student_ID = ? LIMIT 1",
      [sid]
    );

    return res.status(200).json({
      exists: rows.length > 0,
      studentId: sid
    });
  } catch (error) {
    return res.status(500).json({
      exists: false,
      message: "Unable to verify student with the database.",
      details: error.message
    });
  }
}

export async function getStudentSchedule(req, res) {
  const connection = await db.getConnection(); // Use connection from pool
  try {
    const studentId = Number(req.params.studentId);

    if (isNaN(studentId) || studentId <= 0) { // More robust validation
      return res.status(400).json({ error: "Valid studentId is required" });
    }

    const [rows] = await connection.query(
      "SELECT * FROM View_Student_Schedules WHERE Student_ID = ?",
      [studentId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch schedule", details: error.message });
  } finally {
    if (connection) {
      connection.release(); // Release connection
    }
  }
}

export async function getStudentInvoices(req, res) {
  const connection = await db.getConnection();
  try {
    const studentId = Number(req.params.studentId);

    if (isNaN(studentId) || studentId <= 0) {
      return res.status(400).json({ error: "Valid studentId is required" });
    }

    const [invoices] = await connection.query(
      `
      SELECT
        i.Invoice_ID,
        i.Student_ID,
        i.Total_Amount AS Original_Total_Amount,
        i.Due_Date,
        i.Status,
        COALESCE(SUM(p.Amount), 0) AS Amount_Paid,
        (i.Total_Amount - COALESCE(SUM(p.Amount), 0)) AS Outstanding_Balance
      FROM Invoices i
      LEFT JOIN Payments p ON i.Invoice_ID = p.Invoice_ID
      WHERE Student_ID = ?
      GROUP BY i.Invoice_ID, i.Student_ID, i.Total_Amount, i.Due_Date, i.Status
      ORDER BY i.Due_Date DESC
      `,
      [studentId]
    );

    if (!invoices.length) {
      return res.status(200).json([]);
    }

    const invoicesWithItems = await Promise.all(
      invoices.map(async (invoice) => {
        const [items] = await connection.query(
          `SELECT Item_ID, Invoice_ID, Enrollment_ID, Description, Price FROM Invoices_Items WHERE Invoice_ID = ?`,
          [invoice.Invoice_ID] // Corrected: Fetch items only for the current invoice
    );
          return { ...invoice, items };
        })
    );

    return res.status(200).json(invoicesWithItems);
  } catch (error) {
    console.error("Error fetching student invoices:", error);
    return res.status(500).json({ error: "Failed to fetch student invoices", details: error.message });
  } finally {
    connection.release();
  }
}

export async function getStudentAccount(req, res) {
  const dbPool = req.app.locals.db;
  const studentId = Number.parseInt(String(req.params.studentId ?? "").trim(), 10);

  if (!Number.isFinite(studentId) || studentId <= 0) {
    return res.status(400).json({ success: false, message: "Valid studentId is required" });
  }

  try {
    await ensureStudentsAccountPaymentColumn(dbPool);

    const [rows] = await dbPool.query(
      `
      SELECT Student_ID, Name,
             COALESCE(Account_Payment_Status, 'Unpaid') AS Account_Payment_Status
      FROM Students
      WHERE Student_ID = ?
      LIMIT 1
      `,
      [studentId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const row = rows[0];
    const status = normalizePaymentStatusFromRow(row);
    return res.json({
      success: true,
      studentId: row.Student_ID ?? row.student_id,
      name: row.Name ?? row.name,
      accountPaymentStatus: status
    });
  } catch (error) {
    if (String(error.message || "").includes("Unknown column")) {
      return res.status(503).json({
        success: false,
        message: "Account fields missing. Run node add-course-data.js to migrate Students.Account_Payment_Status."
      });
    }
    return res.status(500).json({
      success: false,
      message: "Could not load account",
      details: error.message
    });
  }
}

/**
 * Mock payment: pay remaining balance on all invoices and set student tuition status to Paid.
 */
export async function mockPayTuition(req, res) {
  const dbPool = req.app.locals.db;
  const studentId = Number.parseInt(String(req.params.studentId ?? "").trim(), 10);

  if (!Number.isFinite(studentId) || studentId <= 0) {
    return res.status(400).json({ success: false, message: "Valid studentId is required" });
  }

  const paymentMethodLabel = String(
    req.body?.paymentMethod ?? req.body?.method ?? "Online payment"
  )
    .trim()
    .slice(0, 80);

  try {
    await ensureStudentsAccountPaymentColumn(dbPool);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[mockPayTuition] ensure column", error.message);
    return res.status(503).json({
      success: false,
      message: "Could not prepare billing columns. Run node add-course-data.js."
    });
  }

  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    const [students] = await connection.query(
      "SELECT Student_ID FROM Students WHERE Student_ID = ? FOR UPDATE",
      [studentId]
    );

    if (!students.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const [invoices] = await connection.query(
      `SELECT Invoice_ID, Total_Amount, Status
       FROM Invoices
       WHERE Student_ID = ?
       FOR UPDATE`,
      [studentId]
    );

    for (const inv of invoices) {
      const invoiceId = inv.Invoice_ID ?? inv.invoice_id;
      const [paidRows] = await connection.query(
        `SELECT COALESCE(SUM(Amount), 0) AS totalPaid FROM Payments WHERE Invoice_ID = ?`,
        [invoiceId]
      );
      const totalPaid = Number(
        paidRows[0]?.totalPaid ?? paidRows[0]?.TotalPaid ?? 0
      );
      const totalAmt = Number(inv.Total_Amount ?? inv.total_amount ?? 0);
      const outstanding = Math.max(0, totalAmt - totalPaid);

      if (outstanding > 0.0001) {
        await connection.query(
          `INSERT INTO Payments (Invoice_ID, Amount, Date, Method) VALUES (?, ?, NOW(), ?)`,
          [invoiceId, outstanding, paymentMethodLabel || "Online payment"]
        );
      }

      await connection.query(`UPDATE Invoices SET Status = 'Paid' WHERE Invoice_ID = ?`, [
        invoiceId
      ]);
    }

    await connection.query(
      `UPDATE Students SET Account_Payment_Status = 'Paid' WHERE Student_ID = ?`,
      [studentId]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Payment Successful",
      accountPaymentStatus: "Paid"
    });
  } catch (error) {
    await connection.rollback();
    if (String(error.message || "").includes("Unknown column")) {
      return res.status(503).json({
        success: false,
        message: "Billing columns missing. Run node add-course-data.js, then retry."
      });
    }
    // eslint-disable-next-line no-console
    console.error("[mockPayTuition]", error);
    return res.status(500).json({
      success: false,
      message: "Payment could not be processed."
    });
  } finally {
    connection.release();
  }
}

export async function processPayment(req, res) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { studentId, invoiceId, amount, method } = req.body;

    if (!studentId || !invoiceId || !amount || !method) {
      await connection.rollback();
      return res.status(400).json({ error: "studentId, invoiceId, amount, and method are required" });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Payment amount must be a positive number" });
    }

    // 1. Fetch the invoice and lock it for update to prevent race conditions
    const [invoiceRows] = await connection.query(
      "SELECT Invoice_ID, Student_ID, Total_Amount, Status FROM Invoices WHERE Invoice_ID = ? AND Student_ID = ? FOR UPDATE",
      [invoiceId, studentId]
    );

    if (!invoiceRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Invoice not found for this student" });
    }

    const invoice = invoiceRows[0];

    if (invoice.Status === 'Paid') {
      await connection.rollback();
      return res.status(400).json({ message: "Invoice is already fully paid" });
    }

    // 2. Calculate current amount paid for this invoice
    const [paidAmountRows] = await connection.query(
      "SELECT COALESCE(SUM(Amount), 0) AS totalPaid FROM Payments WHERE Invoice_ID = ?",
      [invoiceId]
    );
    const currentTotalPaid = paidAmountRows[0].totalPaid;

    const outstandingBalance = invoice.Total_Amount - currentTotalPaid;

    if (paymentAmount > outstandingBalance) {
      await connection.rollback();
      return res.status(400).json({ error: `Payment amount exceeds outstanding balance. Outstanding: ${outstandingBalance.toFixed(2)}` });
    }

    // 3. Insert the new payment record
    // Payment_ID is now AUTO_INCREMENT in the schema, so we let the database generate it.
    const [insertResult] = await connection.query(
      "INSERT INTO Payments (Invoice_ID, Amount, Date, Method) VALUES (?, ?, NOW(), ?)",
      [invoiceId, paymentAmount, method]
    );
    const paymentId = insertResult.insertId; // Retrieve the auto-generated Payment_ID

    // 4. Update the invoice status
    const newTotalPaid = currentTotalPaid + paymentAmount;
    let newStatus = invoice.Status; // Default to current status
    if (newTotalPaid >= invoice.Total_Amount) {
      newStatus = 'Paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'Partially Paid'; // Assuming 'Partially Paid' is a valid status for Invoices.Status
    } else {
      newStatus = 'Unpaid'; // Should not be reached if paymentAmount > 0
    }

    await connection.query(
      "UPDATE Invoices SET Status = ? WHERE Invoice_ID = ?",
      [newStatus, invoiceId]
    );

    await connection.commit();
    return res.status(200).json({
      message: "Payment processed successfully",
      paymentId: paymentId,
      newInvoiceStatus: newStatus,
      outstandingBalance: (invoice.Total_Amount - newTotalPaid).toFixed(2)
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error processing payment:", error);
    return res.status(500).json({ error: "Payment failed", details: error.message });
  } finally {
    connection.release();
  }
}
