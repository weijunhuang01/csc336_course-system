import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306)
});

const dbName = process.env.DB_NAME;
const [tables] = await conn.query("SHOW TABLES");
const names = tables.map((r) => Object.values(r)[0]);
// eslint-disable-next-line no-console
console.log("DB:", dbName, "| table count:", names.length);

try {
  const [c] = await conn.query("SELECT COUNT(*) AS n FROM Course_Sections");
  // eslint-disable-next-line no-console
  console.log("Course_Sections rows:", c[0].n);
} catch (e) {
  // eslint-disable-next-line no-console
  console.log("Course_Sections:", e.code, e.message);
}

const keyword = "202";
const pattern = `%${keyword}%`;
const sql = `
      SELECT cs.Section_ID, c.Course_ID, c.Course_Name
      FROM Course_Sections cs
      INNER JOIN Courses c ON c.Course_ID = cs.Course_ID
      INNER JOIN Instructors i ON i.Instructor_ID = cs.Instructor_ID
      WHERE
        TRIM(?) = ''
        OR CAST(c.Course_ID AS CHAR) LIKE ?
        OR c.Course_Name LIKE ?
        OR CAST(cs.Section_ID AS CHAR) LIKE ?
        OR i.Name LIKE ?
      ORDER BY c.Course_ID, cs.Section_ID
      `;

try {
  const [rows] = await conn.query(sql, [
    keyword,
    pattern,
    pattern,
    pattern,
    pattern
  ]);
  // eslint-disable-next-line no-console
  console.log("Search test rows:", rows.length, rows.slice(0, 3));
} catch (e) {
  // eslint-disable-next-line no-console
  console.log("Search SQL error:", e.code, e.message);
}

await conn.end();
