import { Router } from "express";
import { getStudentInvoices, getStudentSchedule } from "../controllers/studentController.js";

const router = Router();

router.get("/:studentId/schedule", getStudentSchedule);
router.get("/:studentId/invoices", getStudentInvoices);

export default router;
