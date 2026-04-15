import { Router } from "express";
import { searchCourses } from "../controllers/courseController.js";

const router = Router();

router.get("/", searchCourses);

export default router;
