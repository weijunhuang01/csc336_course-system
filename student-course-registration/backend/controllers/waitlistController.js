export async function getWaitlistBySection(req, res) {
  const db = req.app.locals.db;
  const { sectionId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT
        w.Waitlist_ID,
        w.Student_ID,
        s.Name AS Student_Name,
        w.Section_ID,
        w.Position
      FROM Waitlist w
      INNER JOIN Students s ON s.Student_ID = w.Student_ID
      WHERE w.Section_ID = ?
      ORDER BY w.Position ASC
      `,
      [sectionId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Unable to fetch waitlist", details: error.message });
  }
}
