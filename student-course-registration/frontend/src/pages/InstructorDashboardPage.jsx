import DashboardShell from "../components/DashboardShell.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const card = {
  maxWidth: "960px",
  margin: "0 auto",
  padding: "20px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  background: "white",
  fontFamily: "Arial, sans-serif"
};

export default function InstructorDashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardShell title="Instructor Dashboard">
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Course & section management</h2>

        <p style={{ color: "#475569", lineHeight: 1.6 }}>
          This area is reserved for instructors to manage course sections,
          capacity, and schedules. Connect your backend instructor APIs here as
          you extend the system.
        </p>

        <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
          Logged-in instructor reference ID:{" "}
          <strong>{user?.instructorId ?? "—"}</strong>
        </p>
      </div>
    </DashboardShell>
  );
}
