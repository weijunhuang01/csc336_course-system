import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { theme } from "../styles/theme.js";

export default function SignUpPage() {
  const { user, isReady, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("student");
  const [studentId, setStudentId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady || !user) return;
    navigate(
      user.role === "student" ? "/student-dashboard" : "/instructor-dashboard",
      { replace: true }
    );
  }, [isReady, user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const result = await register({
      email,
      password,
      role,
      studentId,
      instructorId
    });

    if (!result.ok) {
      setError(result.error || "Registration failed.");
      return;
    }

    navigate(
      result.user.role === "student"
        ? "/student-dashboard"
        : "/instructor-dashboard",
      { replace: true }
    );
  }

  return (
    <main className="scr-auth-shell">
      <div className="scr-auth-card" style={{ maxWidth: "460px" }}>
        <h1 className="scr-auth-title">Create account</h1>
        <p className="scr-auth-lede">
          Register as a student or instructor. Students must use an ID that exists in the
          registration database.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="scr-label" htmlFor="scr-su-email">
            Email
          </label>
          <input
            id="scr-su-email"
            className="scr-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="scr-label" htmlFor="scr-su-password">
            Password
          </label>
          <input
            id="scr-su-password"
            className="scr-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
          />

          <label className="scr-label" htmlFor="scr-su-confirm">
            Confirm password
          </label>
          <input
            id="scr-su-confirm"
            className="scr-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <fieldset
            style={{
              marginTop: "22px",
              border: `1px solid ${theme.muted}33`,
              borderRadius: theme.radiusMd,
              padding: "14px 16px"
            }}
          >
            <legend style={{ padding: "0 8px", color: "#334155", fontSize: "0.9rem", fontWeight: 600 }}>
              Role
            </legend>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input
                type="radio"
                name="role"
                value="student"
                checked={role === "student"}
                onChange={() => setRole("student")}
              />
              Student
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "10px",
                cursor: "pointer"
              }}
            >
              <input
                type="radio"
                name="role"
                value="instructor"
                checked={role === "instructor"}
                onChange={() => setRole("instructor")}
              />
              Instructor
            </label>
          </fieldset>

          {role === "student" ? (
            <>
              <label className="scr-label" htmlFor="scr-su-student">
                Student ID
              </label>
              <input
                id="scr-su-student"
                className="scr-input"
                type="text"
                inputMode="numeric"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Must match your record (e.g. 101)"
                required
              />
              <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: theme.muted, lineHeight: 1.45 }}>
                Use the same ID as in the Students table (see seed script if unsure).
              </p>
            </>
          ) : (
            <>
              <label className="scr-label" htmlFor="scr-su-instructor">
                Instructor ID
              </label>
              <input
                id="scr-su-instructor"
                className="scr-input"
                type="text"
                inputMode="numeric"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
                placeholder="e.g. 501"
                required
              />
            </>
          )}

          {error ? (
            <p style={{ color: "#b91c1c", marginTop: "14px", marginBottom: 0, fontSize: "0.9rem" }}>
              {error}
            </p>
          ) : null}

          <button type="submit" className="scr-btn-primary scr-btn-full">
            Create account
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "22px", marginBottom: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Already have an account?{" "}
          <Link to="/sign-in" className="scr-link">
            Sign in
          </Link>
        </p>

        <p style={{ textAlign: "center", marginTop: "12px", marginBottom: 0 }}>
          <Link to="/" style={{ color: "#64748b", fontSize: "0.9rem", textDecoration: "none" }}>
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
