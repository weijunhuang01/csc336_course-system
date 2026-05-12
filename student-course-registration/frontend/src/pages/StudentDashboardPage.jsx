import { Navigate } from "react-router-dom";
import DashboardShell from "../components/DashboardShell.jsx";
import StudentCoursePanel from "../components/StudentCoursePanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function StudentDashboardPage() {
  const { user } = useAuth();

  if (!user?.studentId) {
    return <Navigate to="/sign-up" replace />;
  }

  return (
    <DashboardShell title="Student Dashboard">
      <StudentCoursePanel studentId={user.studentId} />
    </DashboardShell>
  );
}
