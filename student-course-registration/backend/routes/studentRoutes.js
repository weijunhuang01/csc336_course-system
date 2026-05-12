import { Router } from "express";
import {
  checkStudentExists,
  getStudentAccount,
  getStudentInvoices,
  getStudentSchedule,
  mockPayTuition
} from "../controllers/studentController.js";

const router = Router();

router.get("/:studentId/exists", checkStudentExists);
router.get("/:studentId/account", getStudentAccount);
router.post("/:studentId/payments/mock", mockPayTuition);
router.get("/:studentId/schedule", getStudentSchedule);
router.get("/:studentId/invoices", getStudentInvoices);

export default router;
