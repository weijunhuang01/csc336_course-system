export async function searchCourses(req, res) {
  const db = req.app.locals.db;
  const keyword = (req.query.keyword || "").toString().trim();
  const department = (req.query.department || "").toString().trim();

  try {
    const [rows] = await db.query(
      `
      SELECT
        cs.Section_ID,
        c.Course_ID,
        c.Course_Name,
        c.Credits,
        c.Department,
        cs.Semester,
        cs.Schedule,
        cs.Room,
        cs.Capacity,
        cs.Open_Seats,
        i.Instructor_ID,
        i.Name AS Instructor_Name
      FROM Course_Sections cs
      INNER JOIN Courses c ON c.Course_ID = cs.Course_ID
      INNER JOIN Instructors i ON i.Instructor_ID = cs.Instructor_ID
      WHERE
        (? = '' OR c.Course_ID LIKE ? OR c.Course_Name LIKE ?)
        AND
        (? = '' OR c.Department LIKE ?)
      ORDER BY c.Course_ID, cs.Section_ID
      `,
      [keyword, `%${keyword}%`, `%${keyword}%`, department, `%${department}%`]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Unable to fetch courses", details: error.message });
  }
}
