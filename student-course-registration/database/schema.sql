CREATE DATABASE IF NOT EXISTS student_registration;
USE student_registration;

CREATE TABLE IF NOT EXISTS Department (
  Department_ID INT PRIMARY KEY,
  Name VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS Students (
  Student_ID INT PRIMARY KEY,
  Name VARCHAR(200),
  Department_ID INT,
  Phone VARCHAR(255),
  Email VARCHAR(255),
  Total_Credits_Earned DECIMAL,
  Account_Payment_Status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
  CONSTRAINT fk_students_department
    FOREIGN KEY (Department_ID) REFERENCES Department(Department_ID)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Instructors (
  Instructor_ID INT PRIMARY KEY,
  Name VARCHAR(255),
  Department_ID INT,
  Email VARCHAR(255),
  CONSTRAINT fk_instructors_department
    FOREIGN KEY (Department_ID) REFERENCES Department(Department_ID)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Courses (
  Course_ID INT PRIMARY KEY,
  Course_Name VARCHAR(255),
  Credits INT,
  Department_ID INT,
  Base_Cost DECIMAL(10,2),
  CONSTRAINT fk_courses_department
    FOREIGN KEY (Department_ID) REFERENCES Department(Department_ID)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Course_Sections (
  Section_ID INT PRIMARY KEY,
  Course_ID INT,
  Instructor_ID INT,
    Semester VARCHAR(32),
  Capacity INT,
  Room VARCHAR(10),
  Schedule VARCHAR(20),
  Open_Seats INT,
  Enrolled_Count INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_sections_course
    FOREIGN KEY (Course_ID) REFERENCES Courses(Course_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_sections_instructor
    FOREIGN KEY (Instructor_ID) REFERENCES Instructors(Instructor_ID)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Enrollments (
  Enrollment_ID INT PRIMARY KEY,
  Student_ID INT,
  Section_ID INT,
  Enrollment_date DATETIME,
  Status VARCHAR(10),
  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (Student_ID) REFERENCES Students(Student_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_section
    FOREIGN KEY (Section_ID) REFERENCES Course_Sections(Section_ID)
    ON DELETE CASCADE,
  CONSTRAINT uk_enrollments_student_section UNIQUE (Student_ID, Section_ID)
);

CREATE TABLE IF NOT EXISTS Invoices (
  Invoice_ID INT PRIMARY KEY,
  Student_ID INT,
  Total_Amount DECIMAL(10,2),
  Due_Date DATETIME,
  Status VARCHAR(20),
  CONSTRAINT fk_invoices_student
    FOREIGN KEY (Student_ID) REFERENCES Students(Student_ID)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Invoices_Items (
  Item_ID INT AUTO_INCREMENT PRIMARY KEY,
  Invoice_ID INT,
  Enrollment_ID INT,
  Description VARCHAR(255),
  Price DECIMAL(10,2),
  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (Invoice_ID) REFERENCES Invoices(Invoice_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_enrollment
    FOREIGN KEY (Enrollment_ID) REFERENCES Enrollments(Enrollment_ID)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Payments (
  Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
  Invoice_ID INT,
  Amount DECIMAL(10,2),
  Date DATETIME,
  Method VARCHAR(50),
  CONSTRAINT fk_payments_invoice
    FOREIGN KEY (Invoice_ID) REFERENCES Invoices(Invoice_ID)
    ON DELETE CASCADE
);

/** Portal logins: persisted in MySQL so accounts survive browser restarts and dev-server port changes. */
CREATE TABLE IF NOT EXISTS App_Accounts (
  Account_ID INT AUTO_INCREMENT PRIMARY KEY,
  Email VARCHAR(255) NOT NULL,
  Password_Hash VARCHAR(255) NOT NULL,
  Role VARCHAR(20) NOT NULL,
  Student_ID INT NULL,
  Instructor_ID INT NULL,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_app_accounts_email (Email),
  CONSTRAINT fk_app_accounts_student
    FOREIGN KEY (Student_ID) REFERENCES Students(Student_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_app_accounts_instructor
    FOREIGN KEY (Instructor_ID) REFERENCES Instructors(Instructor_ID)
    ON DELETE CASCADE
);
