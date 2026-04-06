import { useState } from "react";
import DashboardPanels from "./components/DashboardPanels.jsx";

const API_BASE = "http://localhost:5000";

export default function App() {
  const [mode, setMode] = useState("student");
  const [keyword, setKeyword] = useState("");
  const [courses, setCourses] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [message, setMessage] = useState("");

  async function searchCourses() {
    setMessage("");
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    const response = await fetch(`${API_BASE}/courses?${params.toString()}`);
    const data = await response.json();
    setCourses(Array.isArray(data) ? data : []);
  }

  async function enroll() {
    setMessage("");
    const response = await fetch(`${API_BASE}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, sectionId })
    });
    const data = await response.json();
    setMessage(data.message || data.error || "Request completed.");
    await searchCourses();
  }

  return (
    <main style={{ padding: "12px" }}>
      <h1 style={{ textAlign: "center" }}>Student Course Registration System</h1>
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
        <button type="button" onClick={() => setMode("student")}>
          Student
        </button>
        <button type="button" onClick={() => setMode("instructor")}>
          Instructor
        </button>
      </div>
      <DashboardPanels
        mode={mode}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={searchCourses}
        courses={courses}
        studentId={studentId}
        sectionId={sectionId}
        onStudentIdChange={setStudentId}
        onSectionIdChange={setSectionId}
        onEnroll={enroll}
        message={message}
      />
    </main>
  );
}
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import InstructorDashboard from "./pages/InstructorDashboard.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/student" replace />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/instructor" element={<InstructorDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
