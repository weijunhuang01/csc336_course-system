import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div style={{ padding: "24px", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    let fallback = "/";
    if (user.role === "student") {
      fallback = "/student-dashboard";
    } else if (user.role === "instructor") {
      fallback = "/instructor-dashboard";
    } else if (user.role === "admin") {
      fallback = "/admin/revenue";
    }
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
