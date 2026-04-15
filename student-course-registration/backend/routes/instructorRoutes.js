import { Router } from "express";
import { createSection } from "../controllers/instructorController.js";

const router = Router();

router.post("/sections", createSection);

export default router;
