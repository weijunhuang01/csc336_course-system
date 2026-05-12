import DashboardShell from "../components/DashboardShell.jsx";
import InstructorCoursePanel from "../components/InstructorCoursePanel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function InstructorDashboardPage() {
  const { user } = useAuth();
  const instructorId =
    user?.role === "instructor" && user?.instructorId != null
      ? String(user.instructorId).trim()
      : "";

  return (
    <DashboardShell title="Instructor Dashboard">
      <InstructorCoursePanel instructorId={instructorId || null} />
    </DashboardShell>
  );
}
