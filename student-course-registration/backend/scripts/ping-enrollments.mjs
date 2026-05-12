/**
 * Call GET /api/enrollments/student/101 after the API is listening.
 * Usage (from backend/): npm run test:enrollments
 * Optional: node scripts/ping-enrollments.mjs 102
 */
const base = process.env.API_BASE || "http://127.0.0.1:5000";
const id = process.argv[2] || "101";
const url = `${base.replace(/\/$/, "")}/api/enrollments/student/${encodeURIComponent(id)}`;

let res;
let text;
try {
  res = await fetch(url);
  text = await res.text();
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("GET", url);
  // eslint-disable-next-line no-console
  console.error("Request failed:", e.cause?.message || e.message);
  // eslint-disable-next-line no-console
  console.error("Start the backend first: npm run start (from backend/)");
  process.exit(1);
}
let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  parsed = null;
}

// eslint-disable-next-line no-console
console.log("GET", url);
// eslint-disable-next-line no-console
console.log("HTTP", res.status, res.statusText);
// eslint-disable-next-line no-console
console.log(parsed != null ? JSON.stringify(parsed, null, 2) : text);

if (!res.ok && parsed && typeof parsed === "object") {
  const hint =
    parsed.code === "ER_NO_SUCH_TABLE"
      ? "\nHint: wrong database or missing tables (run database/schema.sql and node add-course-data.js)."
      : parsed.code === "ER_BAD_FIELD_ERROR"
        ? "\nHint: live MySQL schema does not match the SELECT (column rename?)."
        : "";
  if (hint) {
    // eslint-disable-next-line no-console
    console.error(hint.trim());
  }
  process.exitCode = 1;
}
