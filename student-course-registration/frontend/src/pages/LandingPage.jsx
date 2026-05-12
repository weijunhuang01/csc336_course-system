import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <main className="scr-auth-shell">
      <div className="scr-auth-card" style={{ maxWidth: "440px", textAlign: "center" }}>
        <h1 className="scr-auth-title" style={{ fontSize: "1.65rem", lineHeight: 1.25 }}>
          Student Course Registration
        </h1>

        <p style={{ color: "#64748b", lineHeight: 1.6, margin: "0 0 8px", fontSize: "1rem" }}>
          Sign in to view your dashboard, search sections, and manage enrollment — or create an
          account as a student or instructor.
        </p>

        <Link
          to="/sign-in"
          className="scr-btn-primary"
          style={{
            width: "100%",
            marginTop: "28px",
            display: "inline-flex",
            boxSizing: "border-box"
          }}
        >
          Sign in
        </Link>

        <Link
          to="/sign-up"
          className="scr-btn-secondary"
          style={{
            width: "100%",
            marginTop: "12px",
            display: "inline-flex",
            boxSizing: "border-box",
            textDecoration: "none"
          }}
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
