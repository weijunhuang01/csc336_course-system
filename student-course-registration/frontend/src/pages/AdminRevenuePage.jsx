import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Link } from "react-router-dom";
import DashboardShell from "../components/DashboardShell.jsx";
import { api } from "../api/paths.js";
import { theme } from "../styles/theme.js";

const fmtMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function formatMonthLabel(ym) {
  if (!ym || ym.length < 7) return ym;
  const d = new Date(`${ym.slice(0, 7)}-01T12:00:00`);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function GrowthBadge({ value, label }) {
  const v = Number(value);
  const pos = v > 0;
  const neg = v < 0;
  const flat = v === 0 || Number.isNaN(v);
  const bg = pos ? "#dcfce7" : neg ? "#fee2e2" : flat ? "#f1f5f9" : "#f1f5f9";
  const color = pos ? "#166534" : neg ? "#991b1b" : "#64748b";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        borderRadius: "999px",
        background: bg,
        color,
        fontSize: "0.8rem",
        fontWeight: 700
      }}
    >
      {flat ? "—" : pos ? "▲" : "▼"} {flat ? "0%" : `${pos ? "+" : ""}${v}%`}
      <span style={{ fontWeight: 500, opacity: 0.85 }}>{label}</span>
    </span>
  );
}

function StatCard({ title, value, subValue, growth, growthLabel }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: theme.radiusLg,
        padding: "22px 24px",
        boxShadow: theme.cardShadow,
        border: "1px solid #f1f5f9",
        minHeight: "120px"
      }}
    >
      <div style={{ fontSize: "0.85rem", color: theme.muted, fontWeight: 600, marginBottom: "8px" }}>
        {title}
      </div>
      <div style={{ fontSize: "1.65rem", fontWeight: 800, letterSpacing: "-0.03em", color: theme.text }}>
        {value}
      </div>
      {subValue ? (
        <div style={{ fontSize: "0.8rem", color: theme.muted, marginTop: "6px" }}>{subValue}</div>
      ) : null}
      {growth != null ? (
        <div style={{ marginTop: "12px" }}>
          <GrowthBadge value={growth} label={growthLabel} />
        </div>
      ) : null}
    </div>
  );
}

function ChartCard({ title, subtitle, children, className }) {
  return (
    <div
      className={className}
      style={{
        background: "#fff",
        borderRadius: theme.radiusLg,
        padding: "22px 20px 16px",
        boxShadow: theme.cardShadow,
        border: "1px solid #f1f5f9",
        minHeight: "320px"
      }}
    >
      <div style={{ marginBottom: "4px" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: theme.text }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: theme.muted }}>{subtitle}</p>
        ) : null}
      </div>
      <div style={{ width: "100%", height: "280px", marginTop: "12px" }}>{children}</div>
    </div>
  );
}

export default function AdminRevenuePage() {
  const [months, setMonths] = useState(12);
  const [range, setRange] = useState("year");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const token = String(import.meta.env.VITE_ADMIN_DASHBOARD_TOKEN ?? "").trim();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = {};
      if (token) {
        headers["X-Admin-Dashboard-Token"] = token;
      }
      const res = await fetch(api.adminRevenueStats({ months, range }), { headers });
      const text = await res.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!res.ok) {
        setError(parsed?.message || `Failed to load (${res.status}).`);
        setData(null);
        return;
      }
      setData(parsed);
    } catch {
      setError("Could not reach the API.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [months, range, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartPayments = useMemo(() => {
    const rows = data?.monthlyPayments;
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      ...r,
      label: formatMonthLabel(r.month)
    }));
  }, [data]);

  const deptChart = useMemo(() => {
    const rows = data?.enrollmentByDepartment;
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      name: r.name?.length > 18 ? `${r.name.slice(0, 16)}…` : r.name,
      fullName: r.name,
      enrollments: r.enrollments
    }));
  }, [data]);

  const semChart = useMemo(() => {
    const rows = data?.enrollmentBySemester;
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      name: r.semester,
      enrollments: r.enrollments
    }));
  }, [data]);

  return (
    <DashboardShell title="Revenue reporting">
      <div className="scr-revenue-root" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 12px" }}>
        <div
          className="scr-print-hide"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}
        >
          <p style={{ margin: 0, color: theme.textSecondary, fontSize: "0.95rem", maxWidth: "42rem" }}>
            Financial and enrollment overview. Compare periods using the range control; charts follow
            the month window.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            <label style={{ fontSize: "0.85rem", color: theme.muted, display: "flex", alignItems: "center", gap: "8px" }}>
              Range
              <select
                className="scr-input"
                style={{ width: "auto", padding: "8px 12px" }}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="month">Month</option>
                <option value="quarter">Quarter</option>
                <option value="year">Year</option>
              </select>
            </label>
            <label style={{ fontSize: "0.85rem", color: theme.muted, display: "flex", alignItems: "center", gap: "8px" }}>
              Chart months
              <select
                className="scr-input"
                style={{ width: "auto", padding: "8px 12px" }}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
            </label>
            <button type="button" className="scr-btn-secondary" onClick={() => void load()}>
              Refresh
            </button>
            <button
              type="button"
              className="scr-btn-outline"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </button>
            <Link to="/" className="scr-link" style={{ fontSize: "0.9rem" }}>
              Home
            </Link>
          </div>
        </div>

        {!token ? (
          <details
            className="scr-print-hide"
            style={{
              marginTop: 0,
              marginBottom: "16px",
              fontSize: "0.85rem",
              color: theme.muted
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 600, color: theme.textSecondary }}>
              Optional: secure revenue API for production
            </summary>
            <p style={{ margin: "10px 0 0", lineHeight: 1.55, paddingLeft: "2px" }}>
              When <code style={{ fontSize: "0.8em" }}>ADMIN_DASHBOARD_TOKEN</code> is not set on the
              server, <code style={{ fontSize: "0.8em" }}>GET /api/admin/revenue-stats</code> accepts
              requests without a header (fine for local dev). For production, set the same secret in{" "}
              <code style={{ fontSize: "0.8em" }}>backend/.env</code> as{" "}
              <code style={{ fontSize: "0.8em" }}>ADMIN_DASHBOARD_TOKEN</code> and in{" "}
              <code style={{ fontSize: "0.8em" }}>frontend/.env</code> as{" "}
              <code style={{ fontSize: "0.8em" }}>VITE_ADMIN_DASHBOARD_TOKEN</code>, then restart both
              processes. The sign-in page still requires an admin account in the database.
            </p>
          </details>
        ) : null}

        {loading ? <p style={{ color: theme.muted }}>Loading analytics…</p> : null}
        {error ? (
          <p style={{ color: "#b91c1c", marginBottom: "16px" }}>
            {error}{" "}
            <button type="button" className="scr-link scr-print-hide" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => void load()}>
              Retry
            </button>
          </p>
        ) : null}

        {!loading && !error && data ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
                marginBottom: "20px"
              }}
            >
              <StatCard
                title="Total paid invoice revenue"
                value={fmtMoney.format(data.metrics?.totalPaidInvoicesRevenue ?? 0)}
                subValue="Sum of invoice totals marked Paid"
                growth={data.metrics?.revenueGrowthPercent}
                growthLabel="vs prior period (payments)"
              />
              <StatCard
                title="Outstanding balance"
                value={fmtMoney.format(data.metrics?.pendingOutstandingBalance ?? 0)}
                subValue="Invoices not yet fully collected"
              />
              <StatCard
                title="Active students"
                value={String(data.metrics?.activeStudents ?? 0)}
                subValue="Distinct students with an active enrollment"
                growth={data.metrics?.enrollmentGrowthPercent}
                growthLabel="vs prior period (dated enrollments)"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
                gap: "16px",
                marginBottom: "16px"
              }}
            >
              <ChartCard
                title="Payment inflow & cumulative"
                subtitle="Tuition payments recorded by month (from Payments table)"
                className="scr-chart-wide"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPayments} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scrFillRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.muted }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: theme.muted }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: theme.muted }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(value, name) =>
                        name === "cumulative"
                          ? [fmtMoney.format(value), "Cumulative"]
                          : [fmtMoney.format(value), "Month payments"]
                      }
                    />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="amount"
                      name="Monthly payments"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#scrFillRev)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulative"
                      name="Cumulative"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard
                title="Enrollments by department"
                subtitle="Active enrollments linked to course department"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChart} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme.muted }} interval={0} angle={-18} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: theme.muted }} />
                    <Tooltip formatter={(v) => [v, "Enrollments"]} labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""} />
                    <Bar dataKey="enrollments" name="Enrollments" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: "16px" }}>
              <ChartCard title="Enrollments by semester" subtitle="Section semester for each active enrollment">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={semChart} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.muted }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: theme.muted }} />
                    <Tooltip />
                    <Bar dataKey="enrollments" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
