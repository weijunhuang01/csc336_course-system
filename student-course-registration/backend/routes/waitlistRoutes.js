import { Router } from "express";
import { getWaitlistBySection } from "../controllers/waitlistController.js";

const router = Router();

router.get("/:sectionId", getWaitlistBySection);

export default router;
