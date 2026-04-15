import { Router } from "express";
import { enrollStudent, updateEnrollmentStatus } from "../controllers/enrollmentController.js";

const router = Router();

router.post("/", enrollStudent);
router.patch("/status", updateEnrollmentStatus);

export default router;
