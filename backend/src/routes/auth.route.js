import express from "express";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
  changePassword,
  getSessions,
  terminateSession,
  terminateOtherSessions,
  blockUser,
  unblockUser,
  getBlockedUsers,
  setup2FA,
  verify2FA,
  disable2FA,
  getProfileStats,
  getStorageStats,
  exportChatData,
  getSharedMedia,
  sendOtp,
  resendOtp,
  verifyOtp,
  deleteAccount,
  getUserProfile,
} from "../controllers/auth.controller.js";
import { saveOnboardingStep, checkUsernameAvailability } from "../controllers/onboarding.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

// Rate limiting middleware to prevent abuse of the send/resend OTP SMS endpoints
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per 15 minutes
  message: { message: "Too many OTP requests from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// ─── Auth & OTP
router.post("/send-otp", otpLimiter, sendOtp);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);

// ─── Profile
router.get("/user/:userId", protectRoute, getUserProfile);
router.put("/update-profile", protectRoute, updateProfile);
router.put("/onboarding", protectRoute, saveOnboardingStep);
router.get("/check-username", protectRoute, checkUsernameAvailability);

// ─── Password
router.put("/change-password", protectRoute, changePassword);

// ─── Sessions
router.get("/sessions", protectRoute, getSessions);
router.delete("/sessions/:sessionId", protectRoute, terminateSession);
router.delete("/sessions", protectRoute, terminateOtherSessions);

// ─── Blocked Users
router.get("/blocked", protectRoute, getBlockedUsers);
router.post("/block/:targetUserId", protectRoute, blockUser);
router.post("/unblock/:targetUserId", protectRoute, unblockUser);

// ─── 2FA
router.post("/2fa/setup", protectRoute, setup2FA);
router.post("/2fa/verify", protectRoute, verify2FA);
router.post("/2fa/disable", protectRoute, disable2FA);

// ─── Stats & Storage
router.get("/profile-stats", protectRoute, getProfileStats);
router.get("/storage-stats", protectRoute, getStorageStats);

// ─── Media & Export
router.get("/shared-media", protectRoute, getSharedMedia);
router.get("/export-data", protectRoute, exportChatData);

// ─── Account Deletion
router.delete("/delete-account", protectRoute, deleteAccount);

export default router;
