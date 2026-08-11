import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getVapidKey, subscribePush, unsubscribePush } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/vapid-key", protectRoute, getVapidKey);
router.post("/subscribe", protectRoute, subscribePush);
router.post("/unsubscribe", protectRoute, unsubscribePush);

export default router;
