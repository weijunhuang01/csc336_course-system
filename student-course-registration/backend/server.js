import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/db.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import waitlistRoutes from "./routes/waitlistRoutes.js";
import instructorRoutes from "./routes/instructorRoutes.js";

dotenv.config();

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

app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/instructor", instructorRoutes);

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await db.query("SELECT 1");
    // eslint-disable-next-line no-console
    console.log("Database Connected");

    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
