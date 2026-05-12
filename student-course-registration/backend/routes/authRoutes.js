import { Router } from "express";
import { loginAccount, registerAccount } from "../controllers/authController.js";

const router = Router();

router.get("/ping", (_req, res) => {
  res.json({
    ok: true,
    auth: "App_Accounts",
    routes: ["POST /api/auth/register", "POST /api/auth/login"]
  });
});

router.post("/register", registerAccount);
router.post("/login", loginAccount);

export default router;
