import { Router } from "express";
import { registerStudent } from "../controllers/registerController.js";

const router = Router();

router.post("/", registerStudent);

export default router;
