export async function registerStudent(req, res) {
  const db = req.app.locals.db;
  const studentId = req.body.student_id ?? req.body.studentId;
  const sectionId = req.body.section_id ?? req.body.sectionId;

  if (!studentId || !sectionId) {
    return res.status(400).json({
      error: "student_id (or studentId) and section_id (or sectionId) are required"
    });
  }

  try {
    await db.query("CALL RegisterStudent(?, ?)", [studentId, sectionId]);
    return res.status(200).json({
      message: "RegisterStudent procedure executed successfully",
      student_id: Number(studentId),
      section_id: Number(sectionId)
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to execute RegisterStudent",
      details: error.message
    });
  }
}
