import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupDetails,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  getGroupMessages,
  sendGroupMessage,
} from "../controllers/group.controller.js";

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getUserGroups);
router.get("/:groupId", protectRoute, getGroupDetails);
router.put("/:groupId", protectRoute, updateGroup);

router.post("/:groupId/members", protectRoute, addGroupMembers);
router.delete("/:groupId/members/:userId", protectRoute, removeGroupMember);
router.post("/:groupId/leave", protectRoute, leaveGroup);

router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/send", protectRoute, sendGroupMessage);

export default router;
