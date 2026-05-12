import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { theme } from "../styles/theme.js";

export default function DashboardShell({ title, children }) {
  const { user, logout } = useAuth();

  return (
    <main
      style={{
        padding: "16px 16px 48px",
        minHeight: "100vh",
        background: theme.bgPage,
        fontFamily: theme.font
      }}
    >
      <header
        style={{
          maxWidth: "960px",
          margin: "0 auto 20px",
          padding: "18px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          background: "#fff",
          borderRadius: theme.radiusLg,
          boxShadow: theme.cardShadow,
          border: "1px solid #f1f5f9"
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: theme.text
            }}
          >
            Course Registration
          </h1>
          {user ? (
            <p style={{ margin: "6px 0 0", color: theme.muted, fontSize: "0.9rem", lineHeight: 1.45 }}>
              Signed in as <strong style={{ color: theme.textSecondary }}>{user.email}</strong>
              {user.role === "student" && user.studentId ? (
                <>
                  {" "}
                  · Student ID <strong style={{ color: theme.textSecondary }}>{user.studentId}</strong>
                </>
              ) : null}
              {user.role === "instructor" && user.instructorId ? (
                <>
                  {" "}
                  · Instructor ID{" "}
                  <strong style={{ color: theme.textSecondary }}>{user.instructorId}</strong>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/" className="scr-link" style={{ fontSize: "0.95rem" }}>
            Home
          </Link>
          <button type="button" className="scr-btn-secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {title ? (
        <h2
          style={{
            textAlign: "center",
            marginBottom: "18px",
            fontSize: "1.05rem",
            fontWeight: 600,
            color: theme.textSecondary,
            letterSpacing: "-0.01em"
          }}
        >
          {title}
        </h2>
      ) : null}

      {children}
    </main>
  );
}
