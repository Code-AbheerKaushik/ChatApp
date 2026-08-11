import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getMessages,
  getUsersForSidebar,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  togglePinMessage,
  markConversationAsRead,
  forwardMessage,
  searchMessages,
  toggleStarMessage,
  getStarredMessages,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, searchMessages);
router.get("/starred", protectRoute, getStarredMessages);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);
router.put("/edit/:id", protectRoute, editMessage);
router.delete("/delete/:id", protectRoute, deleteMessage);
router.post("/react/:id", protectRoute, reactToMessage);
router.post("/forward/:id", protectRoute, forwardMessage);
router.put("/star/:id", protectRoute, toggleStarMessage);
router.put("/pin/:id", protectRoute, togglePinMessage);
router.put("/read/:senderId", protectRoute, markConversationAsRead);

export default router;
