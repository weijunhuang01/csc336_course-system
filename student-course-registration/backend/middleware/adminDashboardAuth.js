/**
 * Optional shared secret for GET /api/admin/revenue-stats.
 * When ADMIN_DASHBOARD_TOKEN is set in backend/.env, requests must send
 * header X-Admin-Dashboard-Token with the same value (set VITE_ADMIN_DASHBOARD_TOKEN in frontend).
 * When unset, the endpoint is open (dev only) — still protect the UI with admin role in React.
 */
export function requireAdminDashboardToken(req, res, next) {
  const required = String(process.env.ADMIN_DASHBOARD_TOKEN ?? "").trim();
  if (!required) {
    return next();
  }
  const sent = String(req.headers["x-admin-dashboard-token"] ?? "").trim();
  if (sent !== required) {
    return res.status(403).json({
      ok: false,
      message: "Admin dashboard token required or invalid."
    });
  }
  return next();
}
