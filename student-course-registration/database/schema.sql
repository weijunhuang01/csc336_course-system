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
  Credits INT NOT NULL,
  Department VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Course_Sections (
  Section_ID VARCHAR(10) PRIMARY KEY,
  Course_ID VARCHAR(10) NOT NULL,
  Instructor_ID VARCHAR(10) NOT NULL,
  Capacity INT NOT NULL CHECK (Capacity >= 0),
  Open_Seats INT NOT NULL CHECK (Open_Seats >= 0),
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
  Position INT NOT NULL,
  CONSTRAINT fk_waitlist_student
    FOREIGN KEY (Student_ID) REFERENCES Students(Student_ID)
    ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_section
    FOREIGN KEY (Section_ID) REFERENCES Course_Sections(Section_ID)
    ON DELETE CASCADE,
  UNIQUE KEY uq_waitlist_student_section (Student_ID, Section_ID),
  UNIQUE KEY uq_waitlist_position (Section_ID, Position)
);
CREATE DATABASE IF NOT EXISTS student_registration;
USE student_registration;

CREATE TABLE IF NOT EXISTS students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instructors (
  instructor_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  department VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_sections (
  section_id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  instructor_id INT NOT NULL,
  term VARCHAR(30) NOT NULL,
  section_code VARCHAR(20) NOT NULL,
  meeting_days VARCHAR(20),
  meeting_time VARCHAR(50),
  location VARCHAR(100),
  capacity INT NOT NULL CHECK (capacity >= 0),
  available_seats INT NOT NULL CHECK (available_seats >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sections_course
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_sections_instructor
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_course_term_section (course_id, term, section_code)
);

CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  section_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_section
    FOREIGN KEY (section_id) REFERENCES course_sections(section_id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_student_section_enrollment (student_id, section_id)
);

CREATE TABLE IF NOT EXISTS waitlist (
  waitlist_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  section_id INT NOT NULL,
  position INT NOT NULL,
  status ENUM('waiting', 'notified', 'enrolled', 'removed') DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_waitlist_student
    FOREIGN KEY (student_id) REFERENCES students(student_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_waitlist_section
    FOREIGN KEY (section_id) REFERENCES course_sections(section_id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_student_section_waitlist (student_id, section_id),
  UNIQUE KEY uq_section_position (section_id, position)
);

INSERT INTO students (name, email, phone)
VALUES
  ('Alice Johnson', 'alice@example.edu', '555-0101'),
  ('Bob Chen', 'bob@example.edu', '555-0102')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO instructors (name, email)
VALUES
  ('Dr. Rivera', 'rivera@example.edu'),
  ('Prof. Malik', 'malik@example.edu')
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO courses (course_code, title, department, description)
VALUES
  ('CSC336', 'Database Systems', 'Computer Science', 'Relational databases and SQL.'),
  ('CSC309', 'Web Programming', 'Computer Science', 'Modern web application development.')
ON DUPLICATE KEY UPDATE course_code = course_code;
