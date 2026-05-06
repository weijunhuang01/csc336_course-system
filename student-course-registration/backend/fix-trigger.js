import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const createTriggerSql = `
CREATE TRIGGER AfterEnrollmentBilling
AFTER INSERT ON Enrollments
FOR EACH ROW
BEGIN
  DECLARE course_price DECIMAL(10,2);
  DECLARE target_invoice_id INT;

  SELECT c.Base_Cost
  INTO course_price
  FROM Courses c
  JOIN Course_Sections cs ON c.Course_ID = cs.Course_ID
  WHERE cs.Section_ID = NEW.Section_ID;

  SELECT Invoice_ID
  INTO target_invoice_id
  FROM Invoices
  WHERE Student_ID = NEW.Student_ID AND Status = 'Unpaid'
  ORDER BY Invoice_ID DESC
  LIMIT 1;

  IF target_invoice_id IS NULL THEN
    INSERT INTO Invoices (Student_ID, Total_Amount, Due_Date, Status)
    VALUES (NEW.Student_ID, 0, DATE_ADD(NOW(), INTERVAL 30 DAY), 'Unpaid');
    SET target_invoice_id = LAST_INSERT_ID();
  END IF;

  INSERT INTO Invoices_Items (Invoice_ID, Enrollment_ID, Description, Price)
  VALUES (target_invoice_id, NEW.Enrollment_ID, 'Course Registration Fee', course_price);

  UPDATE Invoices
  SET Total_Amount = COALESCE(Total_Amount, 0) + COALESCE(course_price, 0)
  WHERE Invoice_ID = target_invoice_id;
END
`;

async function fixTrigger() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "student_registration",
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true
  });

  try {
    await connection.query("DROP TRIGGER IF EXISTS AfterEnrollmentBilling");
    await connection.query(createTriggerSql);
    // eslint-disable-next-line no-console
    console.log("AfterEnrollmentBilling trigger fixed.");
  } finally {
    await connection.end();
  }
}

fixTrigger().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to fix trigger:", error.message);
  process.exit(1);
});
