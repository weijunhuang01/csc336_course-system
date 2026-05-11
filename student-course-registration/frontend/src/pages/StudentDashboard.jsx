import { useState } from "react";
import DashboardPanels from "../components/DashboardPanels.jsx";

const API_BASE = "http://localhost:5000";

export default function StudentDashboard() {
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
    <DashboardPanels
      mode="student"
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
  );
}