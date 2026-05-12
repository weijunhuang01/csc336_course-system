import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/paths.js";
import { theme } from "../styles/theme.js";

/** Read body once; parse JSON when possible (handles non-JSON error pages from proxies). */
async function readFetchBody(response) {
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  return { text, parsed };
}

function apiErrorMessage(parsed, text, fallback) {
  if (parsed && typeof parsed === "object") {
    const main = [parsed.message, parsed.details, parsed.error].find(
      (x) => x != null && String(x).trim() !== ""
    );
    const code =
      parsed.code != null && String(parsed.code).trim() !== ""
        ? ` [${parsed.code}]`
        : "";
    if (main) return String(main) + code;
  }
  if (text && text.trim()) return text.trim().slice(0, 400);
  return fallback;
}

function pickNumber(row, ...keys) {
  for (const k of keys) {
    if (row && row[k] != null && row[k] !== "") {
      const n = Number(row[k]);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** @param {'card'|'paypal'|'aid'} method */
function paymentMethodApiLabel(method) {
  if (method === "paypal") return "PayPal";
  if (method === "aid") return "Student Financial Aid";
  return "Credit Card";
}

/** In dev, or when VITE_PAYMENT_TEST_ALWAYS_OK=true, complete the UI flow even if the API errors (local testing). */
function paymentLenientMode() {
  return (
    import.meta.env.DEV ||
    String(import.meta.env.VITE_PAYMENT_TEST_ALWAYS_OK || "").trim() === "true"
  );
}

function normalizeUiPaymentStatus(raw) {
  const s = String(raw ?? "Unpaid").trim();
  return s.toLowerCase() === "paid" ? "Paid" : s || "Unpaid";
}

function accountIsPaid(status) {
  return String(status ?? "").trim().toLowerCase() === "paid";
}

function statusBadgeVariant(status) {
  const s = String(status ?? "").toLowerCase();
  if (s.includes("enroll") || s === "active" || s === "completed") return "success";
  if (s.includes("pending") || s.includes("wait")) return "warn";
  return "info";
}

function Badge({ children, variant = "success" }) {
  const t =
    variant === "success"
      ? theme.badgeSuccess
      : variant === "warn"
        ? theme.badgeWarn
        : theme.badgeInfo;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "999px",
        background: t.bg,
        color: t.color,
        fontWeight: 700,
        fontSize: "0.75rem",
        letterSpacing: "0.02em",
        border: `1px solid ${t.border}`
      }}
    >
      {children}
    </span>
  );
}

function Spinner({ label }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        color: "#64748b",
        marginBottom: "12px",
        fontSize: "0.95rem"
      }}
    >
      <span
        aria-hidden
        style={{
          width: "20px",
          height: "20px",
          border: "3px solid #e2e8f0",
          borderTopColor: theme.primary,
          borderRadius: "50%",
          animation: "scr-spin 0.75s linear infinite"
        }}
      />
      {label}
    </div>
  );
}

const metaMuted = {
  fontSize: "0.8125rem",
  color: theme.muted,
  lineHeight: 1.45
};

const styles = {
  container: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "8px 16px 48px",
    fontFamily: theme.font,
    color: theme.text
  },
  card: {
    background: "#fff",
    borderRadius: theme.radiusLg,
    padding: "28px",
    marginBottom: "24px",
    boxShadow: theme.cardShadow,
    border: "none"
  },
  heading: {
    marginTop: 0,
    marginBottom: "8px",
    fontSize: "1.35rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: theme.text
  },
  row: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
    alignItems: "center"
  },
  rowWrap: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "16px",
    alignItems: "center"
  },
  inputFlex: {
    flex: "1 1 min(100%, 320px)",
    minWidth: 0
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px"
  },
  item: {
    background: "#fff",
    borderRadius: theme.radiusMd,
    padding: "20px",
    boxShadow: theme.cardShadow,
    border: "1px solid #f1f5f9"
  },
  courseTitle: {
    fontSize: "1.0625rem",
    fontWeight: 700,
    color: theme.text,
    margin: "0 0 12px",
    letterSpacing: "-0.02em",
    lineHeight: 1.35
  },
  messageBox: {
    marginTop: "20px",
    padding: "16px 18px",
    borderRadius: theme.radiusMd,
    backgroundColor: "#eef2ff",
    color: theme.text,
    border: "1px solid #c7d2fe",
    boxShadow: theme.cardShadow
  },
  banner: {
    padding: "14px 18px",
    borderRadius: theme.radiusMd,
    marginBottom: "18px",
    fontSize: "0.95rem",
    lineHeight: 1.5,
    boxShadow: theme.cardShadow
  },
  billingPanel: {
    marginTop: "20px",
    padding: "22px",
    borderRadius: theme.radiusMd,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    boxShadow: "0 1px 2px rgb(0 0 0 / 0.04)"
  }
};

export default function StudentCoursePanel({ studentId: studentIdProp }) {
  const { user } = useAuth();
  const sessionStudentId =
    user?.role === "student" &&
    user?.studentId != null &&
    String(user.studentId).trim() !== ""
      ? String(user.studentId).trim()
      : "";
  const studentId = sessionStudentId || String(studentIdProp ?? "").trim();

  const [keyword, setKeyword] = useState("");
  const [courses, setCourses] = useState([]);
  const [sectionId, setSectionId] = useState("");
  const [message, setMessage] = useState("");
  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentError, setEnrollmentError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  /** unknown | ok | db_error | down */
  const [healthStatus, setHealthStatus] = useState("unknown");
  const [invoices, setInvoices] = useState([]);
  const [accountPaymentStatus, setAccountPaymentStatus] = useState("Unpaid");
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [payModalProcessing, setPayModalProcessing] = useState(false);
  const [payModalError, setPayModalError] = useState("");
  const [paymentThankYou, setPaymentThankYou] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(api.health());
        const { parsed } = await readFetchBody(response);
        if (cancelled) return;

        if (!response.ok) {
          setHealthStatus("down");
          return;
        }

        if (parsed?.ok === true) {
          setHealthStatus("ok");
          return;
        }

        if (parsed?.ok === false || parsed?.status === "db_error") {
          setHealthStatus("db_error");
          return;
        }

        setHealthStatus("down");
      } catch {
        if (!cancelled) setHealthStatus("down");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEnrollments = useCallback(async () => {
    if (!studentId) {
      setEnrollments([]);
      setEnrollmentsLoading(false);
      setEnrollmentError("");
      return;
    }

    setEnrollmentsLoading(true);
    setEnrollmentError("");

    try {
      const response = await fetch(api.enrollmentsByStudent(studentId));
      const { text, parsed } = await readFetchBody(response);

      if (!response.ok) {
        setEnrollmentError(
          apiErrorMessage(
            parsed,
            text,
            `Could not load enrollments (${response.status}).`
          )
        );
        setEnrollments([]);
        return;
      }

      setEnrollments(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      const hint =
        err instanceof TypeError
          ? " Check that the backend is running and that Vite is proxying /api (restart npm run dev)."
          : "";
      setEnrollmentError(
        `Could not load enrollments (${err?.message || "request failed"}).${hint}`
      );
      setEnrollments([]);
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [studentId]);

  const loadInvoices = useCallback(async () => {
    if (!studentId) {
      setInvoices([]);
      return;
    }
    setInvoicesLoading(true);
    try {
      const response = await fetch(api.studentInvoices(studentId));
      const { text, parsed } = await readFetchBody(response);
      if (!response.ok) {
        setInvoices([]);
        return;
      }
      setInvoices(Array.isArray(parsed) ? parsed : []);
    } catch {
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [studentId]);

  const loadAccount = useCallback(async () => {
    if (!studentId) {
      setAccountPaymentStatus("Unpaid");
      return "Unpaid";
    }
    setAccountLoading(true);
    try {
      const response = await fetch(api.studentAccount(studentId));
      const { parsed } = await readFetchBody(response);
      if (!response.ok || !parsed || typeof parsed !== "object") {
        setAccountPaymentStatus("Unpaid");
        return "Unpaid";
      }
      const st =
        parsed.accountPaymentStatus ??
        parsed.Account_Payment_Status ??
        parsed.account_payment_status;
      const normalized = normalizeUiPaymentStatus(st);
      setAccountPaymentStatus(normalized);
      return normalized;
    } catch {
      setAccountPaymentStatus("Unpaid");
      return "Unpaid";
    } finally {
      setAccountLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  useEffect(() => {
    void searchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function searchCourses() {
    setMessage("");
    setSearchError("");
    setCoursesLoading(true);

    try {
      const response = await fetch(
        api.courses(keyword.trim() === "" ? undefined : keyword)
      );
      const { text, parsed } = await readFetchBody(response);

      if (!response.ok) {
        setCourses([]);
        setSearchError(
          apiErrorMessage(
            parsed,
            text,
            `Course search failed (${response.status}). Is the backend running on port 5000?`
          )
        );
        return;
      }

      setCourses(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      setCourses([]);
      setSearchError(
        err instanceof TypeError
          ? "Could not reach the server. Start the backend (npm run start in backend/) and restart npm run dev so /api is proxied."
          : (err?.message || "Course search failed.")
      );
    } finally {
      setCoursesLoading(false);
    }
  }

  async function enroll() {
    setMessage("");

    const sid = String(sectionId).trim();
    if (!sid) {
      setMessage("Enter a Section ID from the results (not the course number).");
      return;
    }

    const response = await fetch(api.enroll(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentId,
        sectionId: sid
      })
    });

    const { text, parsed } = await readFetchBody(response);
    if (!response.ok) {
      setMessage(
        apiErrorMessage(
          parsed,
          text,
          `Enrollment failed (${response.status}).`
        )
      );
      await Promise.all([searchCourses(), loadEnrollments()]);
      return;
    }
    if (parsed && typeof parsed === "object" && parsed.success === false) {
      setMessage(parsed.message || parsed.error || "Enrollment was not completed.");
      await Promise.all([searchCourses(), loadEnrollments(), loadInvoices(), loadAccount()]);
      return;
    }
    const msg =
      parsed && typeof parsed === "object"
        ? parsed.message || parsed.error
        : null;
    setMessage(msg || "Enrollment request completed.");
    await Promise.all([searchCourses(), loadEnrollments(), loadInvoices(), loadAccount()]);
  }

  async function dropCourse(targetSectionId) {
    setMessage("");

    const response = await fetch(api.enrollDrop(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentId,
        sectionId: targetSectionId
      })
    });

    const { text, parsed } = await readFetchBody(response);
    if (!response.ok) {
      setMessage(
        apiErrorMessage(parsed, text, `Drop failed (${response.status}).`)
      );
      await Promise.all([searchCourses(), loadEnrollments()]);
      return;
    }
    const msg =
      parsed && typeof parsed === "object"
        ? parsed.message || parsed.error
        : null;
    setMessage(msg || "Drop request completed.");
    await Promise.all([searchCourses(), loadEnrollments(), loadInvoices(), loadAccount()]);
  }

  const tuitionFromEnrollments = useMemo(() => {
    let total = 0;
    for (const row of enrollments) {
      total += pickNumber(row, "Base_Cost", "base_cost");
    }
    return Math.round(total * 100) / 100;
  }, [enrollments]);

  const invoiceOutstandingTotal = useMemo(() => {
    let total = 0;
    for (const inv of invoices) {
      total += pickNumber(inv, "Outstanding_Balance", "outstanding_balance");
    }
    return Math.round(total * 100) / 100;
  }, [invoices]);

  const hasUnpaidInvoices = useMemo(() => {
    return invoices.some((inv) => {
      const s = String(inv.Status ?? inv.status ?? "").toLowerCase();
      return s !== "paid";
    });
  }, [invoices]);

  const payButtonDisabled =
    !studentId ||
    (accountIsPaid(accountPaymentStatus) &&
      !hasUnpaidInvoices &&
      invoiceOutstandingTotal <= 0.001);

  const closePaymentModalForce = useCallback(() => {
    setPaymentModalOpen(false);
    setPayModalError("");
  }, []);

  const requestClosePaymentModal = useCallback(() => {
    if (payModalProcessing) return;
    closePaymentModalForce();
  }, [payModalProcessing, closePaymentModalForce]);

  useEffect(() => {
    if (!accountIsPaid(accountPaymentStatus)) {
      setPaymentThankYou(false);
    }
  }, [accountPaymentStatus]);

  useEffect(() => {
    if (!paymentModalOpen) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        requestClosePaymentModal();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paymentModalOpen, requestClosePaymentModal]);

  async function submitPaymentFromModal() {
    setPayModalError("");
    if (!studentId) return;

    if (payMethod === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (digits.length < 13 || digits.length > 19 || !/^\d+$/.test(digits)) {
        setPayModalError("Please enter a valid card number.");
        return;
      }
      const exp = cardExpiry.trim();
      if (!/^\d{2}\/\d{2}$/.test(exp)) {
        setPayModalError("Expiry must be MM/YY.");
        return;
      }
      const cvv = cardCvv.trim();
      if (!/^\d{3,4}$/.test(cvv)) {
        setPayModalError("Please enter a valid CVV.");
        return;
      }
    }

    const lenient = paymentLenientMode();

    setPayModalProcessing(true);
    try {
      await sleep(2000);
      let apiSucceeded = false;
      let paymentParsed = null;
      try {
        const response = await fetch(api.studentPayMock(studentId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: paymentMethodApiLabel(payMethod)
          })
        });
        const { parsed } = await readFetchBody(response);
        paymentParsed = parsed;
        apiSucceeded =
          response.ok &&
          !(parsed && typeof parsed === "object" && parsed.success === false);
        if (!apiSucceeded && lenient) {
          // eslint-disable-next-line no-console
          console.warn(
            "[payment] API did not confirm success; continuing in lenient test mode (DEV or VITE_PAYMENT_TEST_ALWAYS_OK)."
          );
        } else if (!apiSucceeded) {
          setPayModalError("Payment failed. Please try again.");
          return;
        }
      } catch (err) {
        if (lenient) {
          // eslint-disable-next-line no-console
          console.warn("[payment] Request failed; continuing in lenient test mode.", err);
        } else {
          setPayModalError("Payment failed. Please try again.");
          return;
        }
      }

      const apiSaysPaid =
        paymentParsed &&
        typeof paymentParsed === "object" &&
        normalizeUiPaymentStatus(
          paymentParsed.accountPaymentStatus ?? paymentParsed.account_payment_status
        ) === "Paid";

      if (apiSucceeded && apiSaysPaid) {
        setAccountPaymentStatus("Paid");
      } else if (apiSucceeded || lenient) {
        setAccountPaymentStatus("Paid");
      }

      setInvoices((prev) =>
        prev.map((inv) => {
          const total = pickNumber(
            inv,
            "Original_Total_Amount",
            "total_amount",
            "Total_Amount"
          );
          return {
            ...inv,
            Status: "Paid",
            Outstanding_Balance: 0,
            Amount_Paid: total
          };
        })
      );

      closePaymentModalForce();
      setPaymentThankYou(true);
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      await Promise.all([searchCourses(), loadEnrollments(), loadInvoices()]);

      let status = await loadAccount();
      for (let attempt = 0; attempt < 8 && status !== "Paid" && (apiSucceeded || lenient); attempt++) {
        await sleep(250);
        await loadInvoices();
        status = await loadAccount();
      }

      if (status !== "Paid" && (apiSucceeded || lenient)) {
        setAccountPaymentStatus("Paid");
        setInvoices((prev) =>
          prev.map((inv) => ({
            ...inv,
            Status: "Paid",
            Outstanding_Balance: 0
          }))
        );
      }
    } finally {
      setPayModalProcessing(false);
    }
  }

  function openPaymentModal() {
    if (payButtonDisabled) return;
    setPayModalError("");
    setPayMethod("card");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setPaymentModalOpen(true);
  }

  const showEnrollmentEmpty =
    !enrollmentsLoading &&
    !enrollmentError &&
    enrollments.length === 0 &&
    Boolean(studentId);

  const showCoursesEmpty =
    !coursesLoading && !searchError && courses.length === 0;

  return (
    <div style={styles.container}>
      {healthStatus === "down" ? (
        <div
          style={{
            ...styles.banner,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca"
          }}
        >
          <strong>We can&apos;t reach the registration server right now.</strong> Check your
          connection and try again. If this keeps happening, try again later or contact support.
        </div>
      ) : null}

      {healthStatus === "db_error" ? (
        <div
          style={{
            ...styles.banner,
            background: "#fffbeb",
            color: "#92400e",
            border: "1px solid #fde68a"
          }}
        >
          <strong>Enrollment data is temporarily unavailable.</strong> The service is running but
          could not verify the database. Please try again later or contact support.
        </div>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.heading}>My enrollments</h2>
        <p style={{ color: theme.muted, fontSize: "0.9rem", marginTop: 0, lineHeight: 1.5 }}>
          Signed in as student <strong style={{ color: theme.textSecondary }}>{studentId || "—"}</strong>
          {studentId ? " — your enrollments are listed below." : "."}
        </p>

        {enrollmentsLoading ? <Spinner label="Loading your enrollments…" /> : null}

        {enrollmentError ? (
          <p style={{ color: "#b91c1c", marginBottom: enrollmentsLoading ? 0 : "12px" }}>
            {enrollmentError}
          </p>
        ) : null}

        <div style={styles.list}>
          {enrollments.map((row) => (
            <div key={`${row.Section_ID}-${row.Enrollment_ID}`} style={styles.item}>
              <div style={styles.courseTitle}>
                {row.Course_ID} — {row.Course_Name}
              </div>
              <div style={{ ...metaMuted, marginBottom: "6px" }}>
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Section ID</span>{" "}
                <span style={{ color: theme.muted }}>{row.Section_ID}</span>
              </div>
              <div
                style={{
                  ...metaMuted,
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap"
                }}
              >
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Status</span>
                <Badge variant={statusBadgeVariant(row.Status)}>{row.Status || "—"}</Badge>
              </div>
              <div style={{ ...metaMuted, marginBottom: "6px" }}>
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Credits</span>{" "}
                <span style={{ color: theme.muted }}>{row.Credits ?? row.credits ?? "—"}</span>
                {" · "}
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Catalog tuition</span>{" "}
                <span style={{ color: theme.muted }}>
                  ${pickNumber(row, "Base_Cost", "base_cost").toFixed(2)}
                </span>
              </div>
              <div style={{ ...metaMuted, marginBottom: "6px" }}>
                Seats —{" "}
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Open</span>{" "}
                {row.Open_Seats ?? row.open_seats ?? "—"},{" "}
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Enrolled</span>{" "}
                {pickNumber(row, "Enrolled_Count", "enrolled_count")}
              </div>
              <div style={{ ...metaMuted, marginBottom: 0 }}>
                {row.Semester} · {row.Schedule} · Room {row.Room}
              </div>
              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="scr-btn-danger"
                  onClick={() => dropCourse(String(row.Section_ID))}
                >
                  Drop section
                </button>
              </div>
            </div>
          ))}
        </div>

        {showEnrollmentEmpty ? (
          <p
            style={{
              color: "#475569",
              marginBottom: 0,
              padding: "16px 18px",
              background: "#f8fafc",
              borderRadius: theme.radiusMd,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgb(0 0 0 / 0.04)"
            }}
          >
            <strong>No courses enrolled yet.</strong> Search for a section below, choose{" "}
            <strong>Use this section</strong>, then click <strong>Enroll</strong> using the{" "}
            <strong>Section ID</strong> (not the course number).
          </p>
        ) : null}

        {(invoicesLoading || accountLoading) && studentId ? (
          <Spinner label="Loading billing…" />
        ) : null}

        <div style={{ ...styles.billingPanel, marginTop: "24px" }}>
          <div style={{ fontWeight: 700, marginBottom: "12px", color: theme.text, fontSize: "1.05rem" }}>
            Tuition & billing
          </div>
          <p style={{ margin: "6px 0", color: "#334155", fontSize: "0.95rem" }}>
            Total tuition (catalog price for each enrolled course):{" "}
            <strong>${tuitionFromEnrollments.toFixed(2)}</strong>
          </p>
          <p style={{ margin: "6px 0", color: "#334155", fontSize: "0.95rem" }}>
            Outstanding invoice balance: <strong>${invoiceOutstandingTotal.toFixed(2)}</strong>
            {accountIsPaid(accountPaymentStatus) && invoiceOutstandingTotal <= 0.001 ? (
              <>
                {" "}
                <Badge variant="success">Paid in full</Badge>
              </>
            ) : null}
          </p>
          <p
            style={{
              margin: "12px 0",
              color: "#334155",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              fontSize: "0.95rem"
            }}
          >
            <span style={{ fontWeight: 600 }}>Account status</span>
            {accountIsPaid(accountPaymentStatus) ? (
              <Badge variant="success">Paid</Badge>
            ) : (
              <>
                <Badge variant="warn">{accountPaymentStatus || "Unpaid"}</Badge>
                {hasUnpaidInvoices ? (
                  <span style={{ fontSize: "0.85rem", color: theme.muted }}>
                    At least one invoice is not marked paid.
                  </span>
                ) : null}
              </>
            )}
          </p>
          {paymentThankYou &&
          accountIsPaid(accountPaymentStatus) &&
          invoiceOutstandingTotal <= 0.001 ? (
            <p
              style={{
                marginTop: "12px",
                marginBottom: 0,
                padding: "14px 16px",
                borderRadius: theme.radiusMd,
                background: "#ecfdf5",
                border: "1px solid #6ee7b7",
                color: "#065f46",
                fontWeight: 600
              }}
            >
              Thank you, your payment was successful!
            </p>
          ) : null}
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center"
            }}
          >
            <button
              type="button"
              className="scr-btn-primary"
              disabled={payButtonDisabled}
              onClick={openPaymentModal}
            >
              Pay now
            </button>
            {!payButtonDisabled ? (
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Opens the payment workflow — choose a method and complete checkout.
              </span>
            ) : (
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                No balance due — payment is not required.
              </span>
            )}
          </div>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.heading}>Course Search & Enrollment</h2>
        <p style={{ color: theme.muted, fontSize: "0.9rem", marginTop: 0, lineHeight: 1.55 }}>
          Search by <strong style={{ color: theme.textSecondary }}>course number</strong>,{" "}
          <strong style={{ color: theme.textSecondary }}>course name</strong>,{" "}
          <strong style={{ color: theme.textSecondary }}>section ID</strong>, or{" "}
          <strong style={{ color: theme.textSecondary }}>instructor</strong>. Each row is one{" "}
          <strong style={{ color: theme.textSecondary }}>section</strong> — use its section ID to
          enroll.
        </p>

        <div style={styles.row}>
          <input
            className="scr-input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Course name, course number, section number, or instructor"
            style={styles.inputFlex}
          />

          <button
            onClick={() => void searchCourses()}
            className="scr-btn-primary"
            type="button"
            disabled={coursesLoading}
          >
            {coursesLoading ? "Searching…" : "Search"}
          </button>
        </div>

        {coursesLoading ? <Spinner label="Loading sections…" /> : null}

        {searchError ? (
          <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{searchError}</p>
        ) : null}

        <div style={styles.list}>
          {courses.map((course) => (
            <div key={course.Section_ID} style={styles.item}>
              <div style={styles.courseTitle}>
                {course.Course_ID} — {course.Course_Name}
              </div>
              <div style={{ ...metaMuted, marginBottom: "6px" }}>
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Section ID</span>{" "}
                <span style={{ color: theme.muted }}>{course.Section_ID}</span>
                {" · "}
                <span style={{ color: theme.muted }}>{course.Department_Name || "—"}</span>
              </div>
              <div style={{ ...metaMuted, marginBottom: "6px" }}>
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Instructor</span>{" "}
                <span style={{ color: theme.muted }}>{course.Instructor_Name || "—"}</span>
              </div>
              <div style={{ ...metaMuted, marginBottom: "6px" }}>
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Tuition</span>{" "}
                <span style={{ color: theme.muted }}>
                  ${pickNumber(course, "Base_Cost", "base_cost").toFixed(2)}
                </span>
                {" · "}
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Credits</span>{" "}
                <span style={{ color: theme.muted }}>{course.Credits ?? course.credits ?? "—"}</span>
              </div>
              <div style={{ ...metaMuted, marginBottom: 0 }}>
                <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Seats</span>{" "}
                <span style={{ color: theme.muted }}>
                  {course.Open_Seats}/{course.Capacity} open ·{" "}
                  {pickNumber(course, "Enrolled_Count", "enrolled_count")} enrolled
                </span>
              </div>
              <div style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="scr-btn-outline"
                  onClick={() => {
                    setSectionId(String(course.Section_ID));
                    setMessage(`Section ${course.Section_ID} selected — click Enroll below.`);
                  }}
                >
                  Use this section
                </button>
              </div>
            </div>
          ))}
        </div>

        {showCoursesEmpty ? (
          <div
            style={{
              color: "#475569",
              padding: "16px 18px",
              background: "#f8fafc",
              borderRadius: theme.radiusMd,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgb(0 0 0 / 0.04)"
            }}
          >
            <strong>No sections to show.</strong> Try another keyword, or clear the box and
            search to list all sections (if the catalog is seeded).
          </div>
        ) : null}

        <div style={styles.rowWrap}>
          <input
            className="scr-input"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            placeholder="Section ID (e.g. 901) — not the course number (201)"
            style={styles.inputFlex}
          />

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={() => void enroll()} className="scr-btn-primary" type="button">
              Enroll
            </button>
          </div>
        </div>

        <p style={{ marginTop: "16px", color: theme.muted, fontSize: "0.9rem", lineHeight: 1.55 }}>
          You are enrolling as student <strong style={{ color: theme.textSecondary }}>{studentId}</strong>{" "}
          using your current session. Enter the <strong style={{ color: theme.textSecondary }}>section ID</strong>{" "}
          from the row you selected — not the course number. Sections with{" "}
          <strong style={{ color: theme.textSecondary }}>no open seats</strong> cannot be added.
        </p>
      </section>

      {paymentModalOpen ? (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => requestClosePaymentModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="scr-pay-title"
            style={{
              background: "#fff",
              borderRadius: theme.radiusLg,
              maxWidth: "440px",
              width: "100%",
              padding: "26px",
              boxShadow: theme.cardShadowLg,
              border: "1px solid #e2e8f0"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="scr-pay-title" style={{ marginTop: 0, marginBottom: "16px", fontSize: "1.2rem" }}>
              Complete payment
            </h3>

            {payModalProcessing ? (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <Spinner label="Processing payment…" />
                <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "8px" }}>
                  Please wait — securely completing your transaction.
                </p>
              </div>
            ) : (
              <>
                <fieldset
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: theme.radiusMd,
                    padding: "14px",
                    marginBottom: "16px"
                  }}
                >
                  <legend style={{ padding: "0 8px", fontSize: "0.9rem", color: "#475569" }}>
                    Payment method
                  </legend>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="payMethod"
                      checked={payMethod === "card"}
                      onChange={() => setPayMethod("card")}
                    />
                    Credit Card
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="payMethod"
                      checked={payMethod === "paypal"}
                      onChange={() => setPayMethod("paypal")}
                    />
                    PayPal
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="payMethod"
                      checked={payMethod === "aid"}
                      onChange={() => setPayMethod("aid")}
                    />
                    Student Financial Aid
                  </label>
                </fieldset>

                {payMethod === "card" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                    <label style={{ fontSize: "0.85rem", color: "#334155" }}>
                      Card number
                      <input
                        className="scr-input"
                        type="text"
                        autoComplete="cc-number"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        style={{ width: "100%", marginTop: "8px", display: "block" }}
                      />
                    </label>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "0.85rem", color: "#334155", flex: "1 1 120px" }}>
                        Expiry (MM/YY)
                        <input
                          className="scr-input"
                          type="text"
                          autoComplete="cc-exp"
                          placeholder="08/27"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          style={{ width: "100%", marginTop: "8px", display: "block" }}
                        />
                      </label>
                      <label style={{ fontSize: "0.85rem", color: "#334155", flex: "1 1 80px" }}>
                        CVV
                        <input
                          className="scr-input"
                          type="password"
                          autoComplete="cc-csc"
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          style={{ width: "100%", marginTop: "8px", display: "block" }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "16px" }}>
                    You will confirm{" "}
                    <strong>{paymentMethodApiLabel(payMethod)}</strong> when you submit.
                  </p>
                )}

                {payModalError ? (
                  <p style={{ color: "#b91c1c", fontSize: "0.9rem", marginBottom: "12px" }}>{payModalError}</p>
                ) : null}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="scr-btn-secondary"
                    onClick={() => requestClosePaymentModal()}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="scr-btn-primary"
                    onClick={() => void submitPaymentFromModal()}
                  >
                    Submit payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {message ? <div style={styles.messageBox}>{message}</div> : null}
    </div>
  );
}
