import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/db.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import registerRoutes from "./routes/registerRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());
app.locals.db = db;

app.get("/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    return res.json({ status: "ok" });
  } catch (error) {
    return res.status(500).json({ status: "db_error", details: error.message });
  }
});

/**
 * Under `/api` so Vite `server.proxy['/api']` forwards here.
 * Always HTTP 200 so the dev server does not look like a "dead" API; use `ok` for DB status.
 */
app.get("/api/health", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    return res.status(200).json({
      ok: true,
      status: "ok",
      database: process.env.DB_NAME || "student_registration"
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      status: "db_error",
      details: error.message
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/register", registerRoutes);
app.use("/api/students", studentRoutes);
app.use("/register", registerRoutes);

const PORT =
  Number.parseInt(String(process.env.PORT ?? "5000").trim(), 10) || 5000;

async function startServer() {
  try {
    await db.query("SELECT 1");
    // eslint-disable-next-line no-console
    console.log("Database Connected");

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${PORT}`);
      // eslint-disable-next-line no-console
      console.log(
        "API auth: GET /api/auth/ping | POST /api/auth/register | POST /api/auth/login"
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
