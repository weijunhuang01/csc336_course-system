import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignInPage() {
  const { user, isReady, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady || !user) return;
    navigate(
      user.role === "student"
        ? "/student-dashboard"
        : user.role === "admin"
          ? "/admin/revenue"
          : "/instructor-dashboard",
      { replace: true }
    );
  }, [isReady, user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const result = await login({ email, password });
    if (!result.ok) {
      setError(result.error || "Sign in failed.");
      return;
    }
    navigate(
      result.user.role === "student"
        ? "/student-dashboard"
        : result.user.role === "admin"
          ? "/admin/revenue"
          : "/instructor-dashboard",
      { replace: true }
    );
  }

  return (
    <main className="scr-auth-shell">
      <div className="scr-auth-card">
        <h1 className="scr-auth-title">Sign in</h1>
        <p className="scr-auth-lede">
          Enter your email and password to open your dashboard.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="scr-label" htmlFor="scr-signin-email">
            Email
          </label>
          <input
            id="scr-signin-email"
            className="scr-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="scr-label" htmlFor="scr-signin-password">
            Password
          </label>
          <input
            id="scr-signin-password"
            className="scr-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error ? (
            <p style={{ color: "#b91c1c", marginTop: "14px", marginBottom: 0, fontSize: "0.9rem" }}>
              {error}
            </p>
          ) : null}

          <button type="submit" className="scr-btn-primary scr-btn-full">
            Sign in
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "22px", marginBottom: 0, color: "#64748b", fontSize: "0.95rem" }}>
          No account?{" "}
          <Link to="/sign-up" className="scr-link">
            Sign up
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
