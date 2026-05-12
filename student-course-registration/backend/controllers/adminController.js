function clampMonths(raw) {
  const n = Number.parseInt(String(raw ?? "12").trim(), 10);
  if (!Number.isFinite(n) || n < 3) return 12;
  return Math.min(36, n);
}

function rangeFromQuery(range) {
  const r = String(range ?? "year").toLowerCase();
  if (r === "month") return { label: "month", months: 1 };
  if (r === "quarter") return { label: "quarter", months: 3 };
  return { label: "year", months: 12 };
}

/**
 * GET /api/admin/revenue-stats?months=12&range=year|quarter|month
 * Aggregates invoices, payments, enrollments for reporting dashboards.
 */
export async function getRevenueStats(req, res) {
  const db = req.app.locals.db;
  const months = clampMonths(req.query.months);
  const { months: compareSpan } = rangeFromQuery(req.query.range);

  try {
    const [[paidRow]] = await db.query(
      `
      SELECT COALESCE(SUM(Total_Amount), 0) AS total
      FROM Invoices
      WHERE LOWER(TRIM(COALESCE(Status, ''))) = 'paid'
      `
    );

    const [[pendingRow]] = await db.query(
      `
      SELECT COALESCE(SUM(GREATEST(0, i.Total_Amount - IFNULL(px.paid, 0))), 0) AS total
      FROM Invoices i
      LEFT JOIN (
        SELECT Invoice_ID, SUM(Amount) AS paid
        FROM Payments
        GROUP BY Invoice_ID
      ) px ON px.Invoice_ID = i.Invoice_ID
      WHERE IFNULL(px.paid, 0) < i.Total_Amount - 0.005
      `
    );

    const [[activeStudentsRow]] = await db.query(
      `
      SELECT COUNT(DISTINCT e.Student_ID) AS n
      FROM Enrollments e
      WHERE e.Status IS NULL OR LOWER(TRIM(e.Status)) = 'enrolled'
      `
    );

    const totalPaidInvoices = Number(paidRow?.total ?? paidRow?.Total ?? 0) || 0;
    const pendingBalance = Number(pendingRow?.total ?? pendingRow?.Total ?? 0) || 0;
    const activeStudents = Number(activeStudentsRow?.n ?? activeStudentsRow?.N ?? 0) || 0;

    const [[currPay]] = await db.query(
      `
      SELECT COALESCE(SUM(p.Amount), 0) AS total
      FROM Payments p
      WHERE p.Date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      `,
      [compareSpan]
    );
    const [[prevPay]] = await db.query(
      `
      SELECT COALESCE(SUM(p.Amount), 0) AS total
      FROM Payments p
      WHERE p.Date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        AND p.Date < DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      `,
      [compareSpan * 2, compareSpan]
    );

    const currPayAmt = Number(currPay?.total ?? currPay?.Total ?? 0) || 0;
    const prevPayAmt = Number(prevPay?.total ?? prevPay?.Total ?? 0) || 0;
    const revenueGrowthPercent =
      prevPayAmt > 0.01
        ? Math.round(((currPayAmt - prevPayAmt) / prevPayAmt) * 1000) / 10
        : currPayAmt > 0.01
          ? 100
          : 0;

    const [[currEnr]] = await db.query(
      `
      SELECT COUNT(*) AS n
      FROM Enrollments e
      WHERE e.Enrollment_date IS NOT NULL
        AND e.Enrollment_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      `,
      [compareSpan]
    );
    const [[prevEnr]] = await db.query(
      `
      SELECT COUNT(*) AS n
      FROM Enrollments e
      WHERE e.Enrollment_date IS NOT NULL
        AND e.Enrollment_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        AND e.Enrollment_date < DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      `,
      [compareSpan * 2, compareSpan]
    );

    const currEnrN = Number(currEnr?.n ?? currEnr?.N ?? 0) || 0;
    const prevEnrN = Number(prevEnr?.n ?? prevEnr?.N ?? 0) || 0;
    const enrollmentGrowthPercent =
      prevEnrN > 0
        ? Math.round(((currEnrN - prevEnrN) / prevEnrN) * 1000) / 10
        : currEnrN > 0
          ? 100
          : 0;

    const [monthlyRows] = await db.query(
      `
      SELECT
        DATE_FORMAT(p.Date, '%Y-%m-01') AS month_start,
        COALESCE(SUM(p.Amount), 0) AS amount
      FROM Payments p
      WHERE p.Date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(p.Date, '%Y-%m-01')
      ORDER BY month_start ASC
      `,
      [months]
    );

    const monthlyPayments = (monthlyRows || []).map((row) => ({
      month: String(row.month_start ?? row.MONTH_START ?? "").slice(0, 7),
      amount: Number(row.amount ?? row.Amount ?? 0) || 0
    }));

    let cumulative = 0;
    const monthlyWithCumulative = monthlyPayments.map((row) => {
      cumulative += row.amount;
      return { ...row, cumulative };
    });

    const [deptRows] = await db.query(
      `
      SELECT
        COALESCE(d.Name, 'Unknown') AS name,
        COALESCE(d.Department_ID, 0) AS departmentId,
        COUNT(DISTINCT e.Enrollment_ID) AS enrollments
      FROM Enrollments e
      INNER JOIN Course_Sections cs ON cs.Section_ID = e.Section_ID
      INNER JOIN Courses c ON c.Course_ID = cs.Course_ID
      LEFT JOIN Department d ON d.Department_ID = c.Department_ID
      WHERE e.Status IS NULL OR LOWER(TRIM(e.Status)) = 'enrolled'
      GROUP BY d.Department_ID, d.Name
      ORDER BY enrollments DESC
      `
    );

    const enrollmentByDepartment = (deptRows || []).map((row) => ({
      name: row.name ?? "Unknown",
      departmentId: row.departmentId,
      enrollments: Number(row.enrollments ?? row.Enrollments ?? 0) || 0
    }));

    const [semRows] = await db.query(
      `
      SELECT
        COALESCE(cs.Semester, 'Unspecified') AS semester,
        COUNT(DISTINCT e.Enrollment_ID) AS enrollments
      FROM Enrollments e
      INNER JOIN Course_Sections cs ON cs.Section_ID = e.Section_ID
      WHERE e.Status IS NULL OR LOWER(TRIM(e.Status)) = 'enrolled'
      GROUP BY cs.Semester
      ORDER BY enrollments DESC
      `
    );

    const enrollmentBySemester = (semRows || []).map((row) => ({
      semester: row.semester ?? "Unspecified",
      enrollments: Number(row.enrollments ?? row.Enrollments ?? 0) || 0
    }));

    return res.json({
      ok: true,
      range: rangeFromQuery(req.query.range).label,
      monthsWindow: months,
      metrics: {
        totalPaidInvoicesRevenue: totalPaidInvoices,
        pendingOutstandingBalance: pendingBalance,
        activeStudents,
        revenueGrowthPercent,
        enrollmentGrowthPercent
      },
      monthlyPayments: monthlyWithCumulative,
      enrollmentByDepartment,
      enrollmentBySemester
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[getRevenueStats]", error.code || "", error.message);
    return res.status(500).json({
      ok: false,
      message: "Could not load revenue statistics.",
      details: error.message
    });
  }
}
