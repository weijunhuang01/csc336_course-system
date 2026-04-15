CREATE DATABASE IF NOT EXISTS student_registration;
USE student_registration;

CREATE TABLE IF NOT EXISTS Students (
  Student_ID VARCHAR(10) PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Email VARCHAR(150) NOT NULL UNIQUE,
  Phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS Instructors (
  Instructor_ID VARCHAR(10) PRIMARY KEY,
  Name VARCHAR(100) NOT NULL,
  Department VARCHAR(100) NOT NULL,
  Email VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS Courses (
  Course_ID VARCHAR(10) PRIMARY KEY,
  Course_Name VARCHAR(150) NOT NULL,
  Credits INT NOT NULL CHECK (Credits > 0),
  Department VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Course_Sections (
  Section_ID VARCHAR(10) PRIMARY KEY,
  Course_ID VARCHAR(10) NOT NULL,
  Instructor_ID VARCHAR(10) NOT NULL,
  Semester VARCHAR(20) NOT NULL,
  Capacity INT NOT NULL CHECK (Capacity >= 0),
  Open_Seats INT NOT NULL CHECK (Open_Seats >= 0),
  Room VARCHAR(50) NOT NULL,
  Schedule VARCHAR(100) NOT NULL,
  CONSTRAINT fk_sections_course
    FOREIGN KEY (Course_ID) REFERENCES Courses(Course_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_sections_instructor
    FOREIGN KEY (Instructor_ID) REFERENCES Instructors(Instructor_ID)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS Enrollments (
  Enrollment_ID INT AUTO_INCREMENT PRIMARY KEY,
  Student_ID VARCHAR(10) NOT NULL,
  Section_ID VARCHAR(10) NOT NULL,
  Status ENUM('Enrolled', 'Dropped') NOT NULL DEFAULT 'Enrolled',
  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (Student_ID) REFERENCES Students(Student_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_section
    FOREIGN KEY (Section_ID) REFERENCES Course_Sections(Section_ID)
    ON DELETE CASCADE,
  UNIQUE KEY uq_student_section (Student_ID, Section_ID)
);

CREATE TABLE IF NOT EXISTS Waitlist (
  Waitlist_ID INT AUTO_INCREMENT PRIMARY KEY,
  Student_ID VARCHAR(10) NOT NULL,
  Section_ID VARCHAR(10) NOT NULL,
  Position INT NOT NULL CHECK (Position > 0),
  CONSTRAINT fk_waitlist_student
    FOREIGN KEY (Student_ID) REFERENCES Students(Student_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_section
    FOREIGN KEY (Section_ID) REFERENCES Course_Sections(Section_ID)
    ON DELETE CASCADE,
  UNIQUE KEY uq_waitlist_student_section (Student_ID, Section_ID),
  UNIQUE KEY uq_waitlist_position (Section_ID, Position)
);
