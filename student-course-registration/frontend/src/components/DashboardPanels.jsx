export default function DashboardPanels({
  mode,
  keyword,
  onKeywordChange,
  onSearch,
  courses,
  studentId,
  sectionId,
  onStudentIdChange,
  onSectionIdChange,
  onEnroll,
  message
}) {
  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        <span style={mode === "student" ? styles.tabActive : styles.tab}>Student Dashboard</span>
        <span style={mode === "instructor" ? styles.tabActive : styles.tab}>Instructor Dashboard</span>
      </div>

      {mode === "student" ? (
        <section style={styles.card}>
          <h2 style={styles.heading}>Course Search & Enrollment</h2>
          <div style={styles.row}>
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="Search by keyword or department"
              style={styles.input}
            />
            <button onClick={onSearch} style={styles.button} type="button">
              Search
            </button>
          </div>

          <div style={styles.list}>
            {courses.map((course) => (
              <div key={course.Section_ID} style={styles.item}>
                <div>
                  <strong>
                    {course.Course_ID} - {course.Course_Name}
                  </strong>
                  <div>{course.Department}</div>
                  <div>Section: {course.Section_ID}</div>
                  <div>
                    Open Seats: {course.Open_Seats}/{course.Capacity}
                  </div>
                </div>
              </div>
            ))}
            {courses.length === 0 ? <div>No courses found.</div> : null}
          </div>

          <div style={styles.rowWrap}>
            <input
              value={studentId}
              onChange={(event) => onStudentIdChange(event.target.value)}
              placeholder="Student ID (e.g. S001)"
              style={styles.input}
            />
            <input
              value={sectionId}
              onChange={(event) => onSectionIdChange(event.target.value)}
              placeholder="Section ID (e.g. SEC001)"
              style={styles.input}
            />
            <button onClick={onEnroll} style={styles.button} type="button">
              Enroll
            </button>
          </div>
        </section>
      ) : (
        <section style={styles.card}>
          <h2 style={styles.heading}>Instructor Dashboard</h2>
          <p>
            Manage schedule and capacity for course sections. This minimalist scaffold keeps the UI simple and ready
            for adding instructor create/update endpoints.
          </p>
        </section>
      )}

      {message ? <div style={styles.message}>{message}</div> : null}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "16px",
    fontFamily: "Arial, sans-serif"
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    flexWrap: "wrap"
  },
  tab: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px"
  },
  tabActive: {
    padding: "8px 12px",
    border: "1px solid #2563eb",
    borderRadius: "8px",
    background: "#dbeafe"
  },
  card: {
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "12px"
  },
  heading: {
    marginTop: 0
  },
  row: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "12px"
  },
  rowWrap: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "12px"
  },
  input: {
    flex: "1 1 240px",
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px"
  },
  button: {
    padding: "10px 14px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer"
  },
  list: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "8px"
  },
  item: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "10px"
  },
  message: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    borderRadius: "8px",
    padding: "10px"
  }
};
