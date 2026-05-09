-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: student_registration
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `course_sections`
--

DROP TABLE IF EXISTS `course_sections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_sections` (
  `Section_ID` int NOT NULL,
  `Course_ID` int DEFAULT NULL,
  `Instructor_ID` int DEFAULT NULL,
  `Semester` varchar(20) DEFAULT NULL,
  `Capacity` int DEFAULT NULL,
  `Room` varchar(10) DEFAULT NULL,
  `Schedule` varchar(20) DEFAULT NULL,
  `Open_Seats` int DEFAULT NULL,
  PRIMARY KEY (`Section_ID`),
  KEY `Course_ID` (`Course_ID`),
  KEY `Instructor_ID` (`Instructor_ID`),
  CONSTRAINT `course_sections_ibfk_1` FOREIGN KEY (`Course_ID`) REFERENCES `courses` (`Course_ID`),
  CONSTRAINT `course_sections_ibfk_2` FOREIGN KEY (`Instructor_ID`) REFERENCES `instructors` (`Instructor_ID`),
  CONSTRAINT `chk_capacity` CHECK ((`Capacity` >= 0)),
  CONSTRAINT `chk_seats` CHECK ((`Open_Seats` <= `Capacity`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_sections`
--

LOCK TABLES `course_sections` WRITE;
/*!40000 ALTER TABLE `course_sections` DISABLE KEYS */;
INSERT INTO `course_sections` VALUES (901,201,501,'Spring 2026',30,'NAC 1/201','MW 2:00PM',22),(902,202,502,'Spring 2026',35,'NAC 2/101','TuTh 11:00AM',34),(903,203,502,'Spring 2026',40,'NAC 2/205','MW 10:00AM',37),(904,204,503,'Spring 2026',30,'MR 1/301','TuTh 1:00PM',29),(905,205,503,'Spring 2026',28,'MR 1/210','MWF 9:00AM',28),(906,206,504,'Spring 2026',32,'PH 3/110','TuTh 3:00PM',32),(907,207,505,'Spring 2026',36,'BIZ 2/220','F 1:00PM',36),(908,202,501,'Fall 2026',35,'NAC 2/102','MW 4:00PM',35),(909,204,503,'Fall 2026',30,'MR 1/305','TuTh 9:30AM',30);
/*!40000 ALTER TABLE `course_sections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `Course_ID` int NOT NULL,
  `Course_Name` varchar(255) NOT NULL,
  `Credits` int DEFAULT NULL,
  `Department_ID` int DEFAULT NULL,
  `Base_Cost` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`Course_ID`),
  KEY `Department_ID` (`Department_ID`),
  CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`Department_ID`) REFERENCES `department` (`Department_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (201,'Modern Distributed Computing',3,1,1200.00),(202,'Database Systems',3,1,1150.00),(203,'Software Engineering',3,1,1100.00),(204,'Linear Algebra',3,2,900.00),(205,'Calculus II',4,2,950.00),(206,'Physics I',4,3,980.00),(207,'Marketing Fundamentals',3,4,1050.00);
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
  `Department_ID` int NOT NULL,
  `Name` varchar(255) NOT NULL,
  PRIMARY KEY (`Department_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` VALUES (1,'Computer Science'),(2,'Mathematics'),(3,'Physics'),(4,'Business');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollments`
--

DROP TABLE IF EXISTS `enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `Enrollment_ID` int NOT NULL AUTO_INCREMENT,
  `Student_ID` int DEFAULT NULL,
  `Section_ID` int DEFAULT NULL,
  `Enrollment_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `Status` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`Enrollment_ID`),
  KEY `Student_ID` (`Student_ID`),
  KEY `Section_ID` (`Section_ID`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`Student_ID`) REFERENCES `students` (`Student_ID`),
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`Section_ID`) REFERENCES `course_sections` (`Section_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollments`
--

LOCK TABLES `enrollments` WRITE;
/*!40000 ALTER TABLE `enrollments` DISABLE KEYS */;
INSERT INTO `enrollments` VALUES (1,101,901,'2026-05-06 11:33:01','Enrolled'),(8,101,901,'2026-05-06 12:00:28','Enrolled'),(9,101,901,'2026-05-06 12:02:09','Enrolled'),(10,101,901,'2026-05-06 12:02:09','Enrolled'),(11,101,901,'2026-05-06 12:03:44','Enrolled'),(12,101,901,'2026-05-06 12:18:02','Enrolled'),(13,101,902,'2026-05-06 12:19:02','Enrolled'),(14,101,903,'2026-05-06 12:30:42','Enrolled'),(15,101,901,'2026-05-06 12:45:50','Enrolled');
/*!40000 ALTER TABLE `enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `instructors`
--

DROP TABLE IF EXISTS `instructors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `instructors` (
  `Instructor_ID` int NOT NULL,
  `Name` varchar(255) NOT NULL,
  `Department_ID` int DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`Instructor_ID`),
  KEY `Department_ID` (`Department_ID`),
  CONSTRAINT `instructors_ibfk_1` FOREIGN KEY (`Department_ID`) REFERENCES `department` (`Department_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `instructors`
--

LOCK TABLES `instructors` WRITE;
/*!40000 ALTER TABLE `instructors` DISABLE KEYS */;
INSERT INTO `instructors` VALUES (501,'Dr. Smith',1,'smith@ccny.edu'),(502,'Dr. Rivera',1,'rivera@ccny.edu'),(503,'Prof. Lee',2,'lee@ccny.edu'),(504,'Dr. Khan',3,'khan@ccny.edu'),(505,'Prof. Patel',4,'patel@ccny.edu');
/*!40000 ALTER TABLE `instructors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `Invoice_ID` int NOT NULL AUTO_INCREMENT,
  `Student_ID` int DEFAULT NULL,
  `Total_Amount` decimal(10,2) DEFAULT NULL,
  `Due_Date` datetime DEFAULT NULL,
  `Status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`Invoice_ID`),
  KEY `Student_ID` (`Student_ID`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`Student_ID`) REFERENCES `students` (`Student_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES (1,101,9450.00,'2026-06-05 12:00:28','Unpaid');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices_items`
--

DROP TABLE IF EXISTS `invoices_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices_items` (
  `Item_ID` int NOT NULL AUTO_INCREMENT,
  `Invoice_ID` int DEFAULT NULL,
  `Enrollment_ID` int DEFAULT NULL,
  `Description` varchar(255) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`Item_ID`),
  KEY `invoices_items_ibfk_2` (`Enrollment_ID`),
  KEY `invoices_items_ibfk_1` (`Invoice_ID`),
  CONSTRAINT `invoices_items_ibfk_1` FOREIGN KEY (`Invoice_ID`) REFERENCES `invoices` (`Invoice_ID`),
  CONSTRAINT `invoices_items_ibfk_2` FOREIGN KEY (`Enrollment_ID`) REFERENCES `enrollments` (`Enrollment_ID`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices_items`
--

LOCK TABLES `invoices_items` WRITE;
/*!40000 ALTER TABLE `invoices_items` DISABLE KEYS */;
INSERT INTO `invoices_items` VALUES (6,1,8,'Course Registration Fee',1200.00),(7,1,9,'Course Registration Fee',1200.00),(8,1,10,'Course Registration Fee',1200.00),(9,1,11,'Course Registration Fee',1200.00),(10,1,12,'Course Registration Fee',1200.00),(11,1,13,'Course Registration Fee',1150.00),(12,1,14,'Course Registration Fee',1100.00),(13,1,15,'Course Registration Fee',1200.00);
/*!40000 ALTER TABLE `invoices_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `Payment_ID` int NOT NULL AUTO_INCREMENT,
  `Invoice_ID` int DEFAULT NULL,
  `Amount` decimal(10,2) DEFAULT NULL,
  `Date` datetime DEFAULT CURRENT_TIMESTAMP,
  `Method` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Payment_ID`),
  KEY `payments_ibfk_1` (`Invoice_ID`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`Invoice_ID`) REFERENCES `invoices` (`Invoice_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `Student_ID` int NOT NULL,
  `Name` varchar(255) NOT NULL,
  `Department_ID` int DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Total_Credits_Earned` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`Student_ID`),
  KEY `Department_ID` (`Department_ID`),
  CONSTRAINT `students_ibfk_1` FOREIGN KEY (`Department_ID`) REFERENCES `department` (`Department_ID`),
  CONSTRAINT `chk_credits` CHECK ((`Total_Credits_Earned` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (101,'Weijun Huang',1,'555-0199','weijun@ccny.cuny.edu',0.00);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `view_student_schedules`
--

DROP TABLE IF EXISTS `view_student_schedules`;
/*!50001 DROP VIEW IF EXISTS `view_student_schedules`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_student_schedules` AS SELECT 
 1 AS `Student_ID`,
 1 AS `Student_Name`,
 1 AS `Course_Name`,
 1 AS `Semester`,
 1 AS `Schedule`,
 1 AS `Room`,
 1 AS `Instructor`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `waitlist`
--

DROP TABLE IF EXISTS `waitlist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `waitlist` (
  `Waitlist_ID` int NOT NULL AUTO_INCREMENT,
  `Student_ID` int DEFAULT NULL,
  `Section_ID` int DEFAULT NULL,
  `Joined_Date` datetime DEFAULT NULL,
  `Position` int DEFAULT NULL,
  PRIMARY KEY (`Waitlist_ID`),
  KEY `Student_ID` (`Student_ID`),
  KEY `Section_ID` (`Section_ID`),
  CONSTRAINT `waitlist_ibfk_1` FOREIGN KEY (`Student_ID`) REFERENCES `students` (`Student_ID`),
  CONSTRAINT `waitlist_ibfk_2` FOREIGN KEY (`Section_ID`) REFERENCES `course_sections` (`Section_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `waitlist`
--

LOCK TABLES `waitlist` WRITE;
/*!40000 ALTER TABLE `waitlist` DISABLE KEYS */;
/*!40000 ALTER TABLE `waitlist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'student_registration'
--
/*!50003 DROP PROCEDURE IF EXISTS `RegisterStudent` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `RegisterStudent`(IN p_student_id INT, IN p_section_id INT)
BEGIN
    DECLARE seats_left INT;
    
    -- Check if there are seats available
    SELECT Open_Seats INTO seats_left FROM Course_Sections WHERE Section_ID = p_section_id;
    
    IF seats_left > 0 THEN
        -- Add the enrollment
        INSERT INTO Enrollments (Enrollment_ID, Student_ID, Section_ID, Status) 
        VALUES (NULL, p_student_id, p_section_id, 'Enrolled');
        
        -- Update the seats
        UPDATE Course_Sections SET Open_Seats = Open_Seats - 1 WHERE Section_ID = p_section_id;
        
        SELECT 'Registration Successful' AS Message;
    ELSE
        SELECT 'Registration Failed: Class Full' AS Message;
    END IF;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `view_student_schedules`
--

/*!50001 DROP VIEW IF EXISTS `view_student_schedules`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `view_student_schedules` AS select `s`.`Student_ID` AS `Student_ID`,`s`.`Name` AS `Student_Name`,`c`.`Course_Name` AS `Course_Name`,`cs`.`Semester` AS `Semester`,`cs`.`Schedule` AS `Schedule`,`cs`.`Room` AS `Room`,`i`.`Name` AS `Instructor` from ((((`students` `s` join `enrollments` `e` on((`s`.`Student_ID` = `e`.`Student_ID`))) join `course_sections` `cs` on((`e`.`Section_ID` = `cs`.`Section_ID`))) join `courses` `c` on((`cs`.`Course_ID` = `c`.`Course_ID`))) join `instructors` `i` on((`cs`.`Instructor_ID` = `i`.`Instructor_ID`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-06 12:51:06
