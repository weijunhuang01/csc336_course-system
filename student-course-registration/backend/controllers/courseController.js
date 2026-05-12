/**
 * Section-centric listing: one row per Course_Sections row.
 * Search matches course id, course name, section id, or instructor name.
 */
const BASE_SECTION_LIST = [
  "SELECT",
  "  cs.Section_ID,",
  "  c.Course_ID,",
  "  c.Course_Name,",
  "  c.Credits,",
  "  c.Base_Cost,",
  "  cs.Semester,",
  "  cs.Schedule,",
  "  cs.Room,",
  "  cs.Capacity,",
  "  cs.Open_Seats,",
  "  COALESCE(cs.Enrolled_Count, GREATEST(0, cs.Capacity - cs.Open_Seats)) AS Enrolled_Count,",
  "  i.Instructor_ID,",
  "  i.Name AS Instructor_Name,",
  "  NULL AS Department_Name",
  "FROM Course_Sections cs",
  "INNER JOIN Courses c ON c.Course_ID = cs.Course_ID",
  "LEFT JOIN Instructors i ON i.Instructor_ID = cs.Instructor_ID"
].join("\n");

export async function searchCourses(req, res) {
  const db = req.app.locals.db;
  const keyword = (req.query.keyword || "").toString().trim();

  try {
    let rows;
    if (keyword === "") {
      const [r] = await db.query(
        `${BASE_SECTION_LIST}
        ORDER BY c.Course_ID, cs.Section_ID`
      );
      rows = r;
    } else {
      const pattern = `%${keyword}%`;
      const [r] = await db.query(
        `${BASE_SECTION_LIST}
        WHERE
          CAST(c.Course_ID AS CHAR) LIKE ?
          OR c.Course_Name LIKE ?
          OR CAST(cs.Section_ID AS CHAR) LIKE ?
          OR COALESCE(i.Name, '') LIKE ?
        ORDER BY c.Course_ID, cs.Section_ID
        `,
        [pattern, pattern, pattern, pattern]
      );
      rows = r;
    }

    return res.json(rows);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[searchCourses]", error.code || "", error.message);
    return res.status(500).json({
      error: "Unable to fetch courses",
      details: error.message || String(error),
      code: error.code
    });
  }
}
