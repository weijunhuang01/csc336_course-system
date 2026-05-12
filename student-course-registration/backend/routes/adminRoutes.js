import { Router } from "express";
import { getRevenueStats } from "../controllers/adminController.js";
import { requireAdminDashboardToken } from "../middleware/adminDashboardAuth.js";

const router = Router();

router.get("/revenue-stats", requireAdminDashboardToken, getRevenueStats);

export default router;
