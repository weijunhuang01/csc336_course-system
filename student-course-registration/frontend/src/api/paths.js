import { API_BASE } from "../constants.js";

/** Same-origin `/api/...` in dev (Vite proxy → Express). Absolute URL when `VITE_API_BASE` is set. */
function apiPath(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export const api = {
  health: () => apiPath("/api/health"),
  authPing: () => apiPath("/api/auth/ping"),
  authRegister: () => apiPath("/api/auth/register"),
  authLogin: () => apiPath("/api/auth/login"),
  /** GET ?keyword= optional */
  courses: (keyword) => {
    const q =
      keyword != null && String(keyword).trim() !== ""
        ? `?keyword=${encodeURIComponent(String(keyword).trim())}`
        : "";
    return apiPath(`/api/courses${q}`);
  },
  enrollmentsByStudent: (studentId) =>
    apiPath(`/api/enrollments/student/${encodeURIComponent(String(studentId))}`),
  studentExists: (studentId) =>
    apiPath(
      `/api/students/${encodeURIComponent(String(studentId).trim())}/exists`
    ),
  studentAccount: (studentId) =>
    apiPath(
      `/api/students/${encodeURIComponent(String(studentId).trim())}/account`
    ),
  studentPayMock: (studentId) =>
    apiPath(
      `/api/students/${encodeURIComponent(String(studentId).trim())}/payments/mock`
    ),
  studentInvoices: (studentId) =>
    apiPath(
      `/api/students/${encodeURIComponent(String(studentId).trim())}/invoices`
    ),
  enroll: () => apiPath("/api/enrollments"),
  enrollDrop: () => apiPath("/api/enrollments/drop"),

  instructorSections: (instructorId) =>
    apiPath(`/api/instructor/${encodeURIComponent(String(instructorId))}/sections`),
  instructorRoster: (instructorId, sectionId) =>
    apiPath(
      `/api/instructor/${encodeURIComponent(String(instructorId))}/sections/${encodeURIComponent(String(sectionId))}/roster`
    ),
  instructorPatchSection: (instructorId, sectionId) =>
    apiPath(
      `/api/instructor/${encodeURIComponent(String(instructorId))}/sections/${encodeURIComponent(String(sectionId))}`
    )
};
