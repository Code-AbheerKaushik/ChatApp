import express from "express";
import { checkAuth, login, logout, signup, updateProfile } from "../controllers/auth.controller.js";
import { saveOnboardingStep, checkUsernameAvailability } from "../controllers/onboarding.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/onboarding", protectRoute, saveOnboardingStep);
router.get("/check-username", protectRoute, checkUsernameAvailability);

router.get("/check", protectRoute, checkAuth);

export default router;
