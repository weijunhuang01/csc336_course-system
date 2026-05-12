import { useCallback, useEffect, useState } from "react";
import { api } from "../api/paths.js";
import { theme } from "../styles/theme.js";

async function readJsonResponse(response) {
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

function Badge({ children, variant = "info" }) {
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

const metaMuted = {
  fontSize: "0.8125rem",
  color: theme.muted,
  lineHeight: 1.45
};

const cardStyle = {
  background: "#fff",
  borderRadius: theme.radiusMd,
  padding: "20px",
  boxShadow: theme.cardShadow,
  border: "1px solid #f1f5f9",
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

export default function InstructorCoursePanel({ instructorId }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterSection, setRosterSection] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [editCapacity, setEditCapacity] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const loadSections = useCallback(async () => {
    if (!instructorId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(api.instructorSections(instructorId));
      const { parsed } = await readJsonResponse(res);
      if (!res.ok) {
        setError(
          parsed?.message ||
            parsed?.error ||
            `Could not load sections (${res.status}).`
        );
        setSections([]);
        return;
      }
      setSections(Array.isArray(parsed?.sections) ? parsed.sections : []);
    } catch {
      setError("Could not reach the server. Start the backend and use Vite dev (proxy /api).");
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  async function openRoster(section) {
    setRosterSection(section);
    setRosterStudents([]);
    setRosterError("");
    setRosterOpen(true);
    setRosterLoading(true);
    try {
      const res = await fetch(api.instructorRoster(instructorId, section.sectionId));
      const { parsed } = await readJsonResponse(res);
      if (!res.ok) {
        setRosterError(parsed?.message || `Could not load roster (${res.status}).`);
        return;
      }
      setRosterStudents(Array.isArray(parsed?.students) ? parsed.students : []);
    } catch {
      setRosterError("Network error loading roster.");
    } finally {
      setRosterLoading(false);
    }
  }

  function openEdit(section) {
    setEditSection(section);
    setEditCapacity(String(section.capacity ?? ""));
    setEditSchedule(String(section.schedule ?? ""));
    setEditRoom(String(section.room ?? ""));
    setEditError("");
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editSection || !instructorId) return;
    setEditSaving(true);
    setEditError("");
    try {
      const body = {};
      const capNum = Number.parseInt(String(editCapacity).trim(), 10);
      if (Number.isFinite(capNum) && capNum > 0) {
        body.capacity = capNum;
      }
      if (String(editSchedule).trim() !== "") {
        body.schedule = String(editSchedule).trim();
      }
      if (String(editRoom).trim() !== "") {
        body.room = String(editRoom).trim();
      }

      if (Object.keys(body).length === 0) {
        setEditError("Change capacity, schedule, or room before saving.");
        setEditSaving(false);
        return;
      }

      const res = await fetch(api.instructorPatchSection(instructorId, editSection.sectionId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const { parsed } = await readJsonResponse(res);
      if (!res.ok) {
        setEditError(parsed?.message || `Update failed (${res.status}).`);
        return;
      }
      setEditOpen(false);
      await loadSections();
    } catch {
      setEditError("Network error while saving.");
    } finally {
      setEditSaving(false);
    }
  }

  if (!instructorId) {
    return (
      <section
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "28px",
          borderRadius: theme.radiusLg,
          background: "#fff",
          boxShadow: theme.cardShadow,
          fontFamily: theme.font,
          color: theme.muted
        }}
      >
        Sign in as an instructor to manage your sections.
      </section>
    );
  }

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "0 8px 48px",
        fontFamily: theme.font,
        color: theme.text
      }}
    >
      <section
        style={{
          padding: "28px",
          borderRadius: theme.radiusLg,
          background: "#fff",
          boxShadow: theme.cardShadow,
          marginBottom: "24px"
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "8px",
            fontSize: "1.35rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: theme.text
          }}
        >
          My courses
        </h2>
        <p style={{ marginTop: 0, marginBottom: "20px", color: theme.muted, fontSize: "0.95rem", lineHeight: 1.55 }}>
          Sections you teach this term. Open seats update automatically when capacity or enrollment
          changes.
        </p>

        {loading ? (
          <p style={{ color: theme.muted }}>Loading your sections…</p>
        ) : null}
        {error ? (
          <p style={{ color: "#b91c1c", marginBottom: "12px" }}>{error}</p>
        ) : null}

        {!loading && !error && sections.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: "16px 18px",
              background: "#f8fafc",
              borderRadius: theme.radiusMd,
              border: "1px solid #e2e8f0",
              color: theme.textSecondary
            }}
          >
            No sections assigned to your instructor ID yet. Ask an administrator or seed the database
            with sections for your ID.
          </p>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px"
          }}
        >
          {sections.map((s) => {
            const cap = Number(s.capacity) || 0;
            const enrolledRaw = Number(s.enrolledCount);
            const enrolled = Number.isFinite(enrolledRaw) ? enrolledRaw : 0;
            const openRaw = Number(s.openSeats);
            const open = Number.isFinite(openRaw) ? openRaw : Math.max(0, cap - enrolled);
            return (
              <div key={s.sectionId} style={cardStyle}>
                <div
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    color: theme.text,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.35
                  }}
                >
                  {s.courseName || "Course"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                  <Badge variant="info">Section {s.sectionId}</Badge>
                  {s.semester ? <Badge variant="success">{s.semester}</Badge> : null}
                </div>
                <div style={metaMuted}>
                  <span style={{ color: theme.textSecondary, fontWeight: 600 }}>Enrollment</span>{" "}
                  <span style={{ color: theme.text, fontWeight: 700 }}>
                    {enrolled} / {cap}
                  </span>{" "}
                  students
                  <span style={{ color: theme.muted }}> · {open} open seats</span>
                </div>
                <div style={{ ...metaMuted, marginTop: "4px" }}>
                  <span style={{ color: theme.textSecondary, fontWeight: 600 }}>When / where</span>{" "}
                  <span style={{ color: theme.muted }}>
                    {s.schedule || "—"} · Room {s.room || "—"}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    className="scr-btn-outline"
                    onClick={() => openRoster(s)}
                  >
                    View roster
                  </button>
                  <button type="button" className="scr-btn-primary" onClick={() => openEdit(s)}>
                    Edit section
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {rosterOpen ? (
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
          onClick={() => setRosterOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              background: "#fff",
              borderRadius: theme.radiusLg,
              maxWidth: "480px",
              width: "100%",
              padding: "26px",
              boxShadow: theme.cardShadowLg,
              border: "1px solid #e2e8f0",
              maxHeight: "85vh",
              overflow: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "12px", fontSize: "1.15rem" }}>
              Roster · Section {rosterSection?.sectionId}
            </h3>
            <p style={{ marginTop: 0, color: theme.muted, fontSize: "0.9rem" }}>
              {rosterSection?.courseName}
            </p>

            {rosterLoading ? <p style={{ color: theme.muted }}>Loading…</p> : null}
            {rosterError ? <p style={{ color: "#b91c1c", fontSize: "0.9rem" }}>{rosterError}</p> : null}

            {!rosterLoading && !rosterError && rosterStudents.length === 0 ? (
              <p style={{ color: theme.textSecondary }}>No students enrolled yet.</p>
            ) : null}

            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {rosterStudents.map((stu) => (
                <li
                  key={stu.studentId}
                  style={{
                    padding: "10px 12px",
                    borderRadius: theme.radiusSm,
                    border: "1px solid #f1f5f9",
                    marginBottom: "8px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap"
                  }}
                >
                  <span style={{ fontWeight: 600, color: theme.text }}>
                    {stu.name || "Unknown"}
                  </span>
                  <Badge variant="info">ID {stu.studentId}</Badge>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="scr-btn-secondary"
              style={{ marginTop: "16px" }}
              onClick={() => setRosterOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {editOpen ? (
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
          onClick={() => !editSaving && setEditOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
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
            <h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "1.15rem" }}>
              Edit section {editSection?.sectionId}
            </h3>
            <p style={{ marginTop: 0, marginBottom: "18px", color: theme.muted, fontSize: "0.9rem" }}>
              {editSection?.courseName}. Open seats will be recalculated from capacity minus current
              enrollment.
            </p>

            <label className="scr-label" htmlFor="scr-ins-cap">
              Max capacity
            </label>
            <input
              id="scr-ins-cap"
              className="scr-input"
              type="number"
              min={1}
              value={editCapacity}
              onChange={(e) => setEditCapacity(e.target.value)}
              style={{ width: "100%", marginBottom: "14px" }}
            />

            <label className="scr-label" htmlFor="scr-ins-sched">
              Schedule
            </label>
            <input
              id="scr-ins-sched"
              className="scr-input"
              type="text"
              value={editSchedule}
              onChange={(e) => setEditSchedule(e.target.value)}
              placeholder="e.g. MW 10:00–11:15"
              style={{ width: "100%", marginBottom: "14px" }}
            />

            <label className="scr-label" htmlFor="scr-ins-room">
              Room
            </label>
            <input
              id="scr-ins-room"
              className="scr-input"
              type="text"
              value={editRoom}
              onChange={(e) => setEditRoom(e.target.value)}
              placeholder="e.g. H101"
              style={{ width: "100%", marginBottom: "14px" }}
            />

            {editError ? (
              <p style={{ color: "#b91c1c", fontSize: "0.9rem", marginBottom: "12px" }}>{editError}</p>
            ) : null}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="scr-btn-secondary"
                disabled={editSaving}
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="scr-btn-primary" disabled={editSaving} onClick={() => void submitEdit()}>
                {editSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
