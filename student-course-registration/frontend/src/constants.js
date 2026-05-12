/**
 * In dev, always use same-origin `/api` so Vite's `server.proxy` forwards to Express.
 * Honoring VITE_API_BASE in dev often breaks sign-up (e.g. base set to the Vite port → POST /api/... returns 404).
 * For production / `vite preview`, set VITE_API_BASE to the API origin (no trailing `/api`; paths already include `/api/...`).
 */
function resolveApiBase() {
  if (import.meta.env.DEV) {
    return "";
  }
  const fromEnv = import.meta.env.VITE_API_BASE;
  if (fromEnv != null && String(fromEnv).trim() !== "") {
    let base = String(fromEnv).trim().replace(/\/$/, "");
    if (/\/api$/i.test(base)) {
      base = base.replace(/\/api$/i, "");
    }
    return base;
  }
  return "http://localhost:5000";
}

export const API_BASE = resolveApiBase();
