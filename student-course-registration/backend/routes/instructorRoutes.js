import { Router } from "express";
import {
  createSection,
  getInstructorSections,
  getSectionRoster,
  updateInstructorSection
} from "../controllers/instructorController.js";

const router = Router();

router.post("/sections", createSection);

router.get("/:instructorId/sections/:sectionId/roster", getSectionRoster);
router.patch("/:instructorId/sections/:sectionId", updateInstructorSection);
router.get("/:instructorId/sections", getInstructorSections);

export default router;
