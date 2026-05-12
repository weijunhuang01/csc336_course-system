import { Router } from "express";
import {
  getEnrollmentsForStudent,
  enrollStudent,
  dropStudent
} from "../controllers/enrollmentController.js";

const router = Router();

router.get("/student/:studentId", getEnrollmentsForStudent);

router.post("/drop", dropStudent);

router.post("/", enrollStudent);

export default router;