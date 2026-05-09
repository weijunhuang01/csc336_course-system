import db from "../config/db.js";

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
