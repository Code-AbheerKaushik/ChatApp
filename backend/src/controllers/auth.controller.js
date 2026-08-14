import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import Message from "../models/message.model.js";
import twilio from "twilio";
import jwt from "jsonwebtoken";
import { io } from "../lib/socket.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const buildUserResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  username: user.username,
  profile: user.profile,
  privacy: user.privacy,
  blockedUsers: user.blockedUsers,
  twoFactor: { enabled: user.twoFactor?.enabled ?? false },
  onboardingStep: user.onboardingStep,
  onboardingComplete: user.onboardingComplete ?? true,
  createdAt: user.createdAt,
});

// Helper to get configured Twilio client
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error("Twilio Verify service is not properly configured. Please check server environment variables.");
  }
  return {
    client: twilio(accountSid, authToken),
    serviceSid,
  };
};

// Map to track phone number cooldowns (phone -> lastSentTimestamp)
const otpCooldowns = new Map();

// Reusable helper to send verification SMS via Twilio Verify
const sendVerificationSms = async (phone) => {
  const cleanPhone = phone.trim();

  // Verify phone number format matches E.164 (starts with +, followed by 7 to 15 digits)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleanPhone)) {
    const err = new Error("Invalid phone number format. Must be in international E.164 format (e.g., +1234567890).");
    err.statusCode = 400;
    throw err;
  }

  // Check if phone number is already registered by another verified account
  const existingUser = await User.findOne({ phone: cleanPhone, isPhoneVerified: true });
  if (existingUser) {
    const err = new Error("This phone number is already registered to another account");
    err.statusCode = 400;
    throw err;
  }

  // Enforce 60-second cooldown per phone number
  const lastSent = otpCooldowns.get(cleanPhone);
  const now = Date.now();
  if (lastSent && now - lastSent < 60000) {
    const remaining = Math.ceil((60000 - (now - lastSent)) / 1000);
    const err = new Error(`Please wait ${remaining} seconds before requesting another OTP.`);
    err.statusCode = 429;
    throw err;
  }

  const { client, serviceSid } = getTwilioClient();

  try {
    // Trigger SMS OTP send using Twilio Verify
    await client.verify.v2.services(serviceSid)
      .verifications
      .create({ to: cleanPhone, channel: "sms" });
  } catch (error) {
    console.error("Twilio Verify API Error:", error);
    // Gracefully handle Twilio rate limits (60203 max attempts reached or HTTP 429)
    if (error.code === 60203 || error.status === 429) {
      const err = new Error("Twilio Verify request limit exceeded. Please try again in a few minutes.");
      err.statusCode = 429;
      throw err;
    }
    const err = new Error(error.message || "Failed to deliver SMS verification.");
    err.statusCode = error.status || 500;
    throw err;
  }

  // Record cooldown timestamp
  otpCooldowns.set(cleanPhone, now);
  return cleanPhone;
};

// ──────────────────────────────────────────────────────────────────────────────
// OTP Phone Verification
// ──────────────────────────────────────────────────────────────────────────────

export const sendOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
      return res.status(400).json({ message: "Valid phone number with country code is required" });
    }

    const cleanPhone = await sendVerificationSms(phone);

    res.status(200).json({
      message: "OTP sent successfully via Twilio Verify",
      phone: cleanPhone,
    });
  } catch (error) {
    console.error("Error in sendOtp controller:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to send OTP. Please try again." });
  }
};

export const resendOtp = async (req, res) => {
  const { phone } = req.body;
  try {
    if (!phone || typeof phone !== "string" || phone.trim().length < 7) {
      return res.status(400).json({ message: "Valid phone number with country code is required" });
    }

    const cleanPhone = await sendVerificationSms(phone);

    res.status(200).json({
      message: "OTP resent successfully via Twilio Verify",
      phone: cleanPhone,
    });
  } catch (error) {
    console.error("Error in resendOtp controller:", error);
    res.status(error.statusCode || 500).json({ message: error.message || "Failed to resend OTP. Please try again." });
  }
};

export const verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  try {
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and OTP code are required" });
    }

    const cleanPhone = phone.trim();

    const { client, serviceSid } = getTwilioClient();

    let verificationCheck;
    try {
      // Check verification code with Twilio Verify
      verificationCheck = await client.verify.v2.services(serviceSid)
        .verificationChecks
        .create({ to: cleanPhone, code: otp.trim() });
    } catch (error) {
      console.error("Twilio verification check error:", error);
      // Handle known Twilio error states:
      // 60202: Max verification check attempts reached
      // 20404: Verification session expired or not found
      if (error.code === 60202) {
        return res.status(429).json({ message: "Too many incorrect verification attempts. Please request a new OTP." });
      }
      if (error.code === 20404) {
        return res.status(400).json({ message: "Verification session expired or not found. Please click Resend OTP." });
      }
      return res.status(error.status || 500).json({ message: error.message || "Verification check failed." });
    }

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({ message: "Invalid OTP code. Please try again." });
    }

    // OTP Verified! Generate a secure short-lived temporary verification token
    const verificationToken = jwt.sign(
      { phone: cleanPhone, verified: true },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.status(200).json({
      message: "Phone number verified successfully!",
      phone: cleanPhone,
      verificationToken,
    });
  } catch (error) {
    console.error("Error in verifyOtp controller:", error);
    res.status(500).json({ message: "Failed to verify OTP." });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Signup
// ──────────────────────────────────────────────────────────────────────────────

export const signup = async (req, res) => {
  const { fullName, email, password, phone, verificationToken } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    // Validate phone verification
    if (!phone || !verificationToken) {
      return res.status(400).json({ message: "Phone number verification is required" });
    }

    const cleanPhone = phone.trim();
    try {
      const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
      if (decoded.phone !== cleanPhone || !decoded.verified) {
        return res.status(400).json({ message: "Invalid or expired phone verification. Please verify your phone number again." });
      }
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired phone verification. Please verify your phone number again." });
    }

    // Check if phone number is already registered by another verified account
    const existingUser = await User.findOne({ phone: cleanPhone, isPhoneVerified: true });
    if (existingUser) {
      return res.status(400).json({ message: "This phone number is already registered to another account" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      phone: cleanPhone,
      isPhoneVerified: true,
      profile: {
        phone: cleanPhone,
      },
    });
    await newUser.save();

    const { token } = await generateToken(newUser._id, res, req);

    res.status(201).json({ ...buildUserResponse(newUser), token });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────────────────────────────────────

export const login = async (req, res) => {
  const { email, password, totpToken } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

    // 2FA check
    if (user.twoFactor?.enabled) {
      if (!totpToken) {
        return res.status(200).json({ requires2FA: true, message: "2FA token required" });
      }
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactor.secret,
        encoding: "base32",
        token: totpToken,
        window: 2,
      });
      if (!isValid) {
        return res.status(401).json({ message: "Invalid 2FA token" });
      }
    }

    if (user.onboardingComplete !== true) {
      user.onboardingComplete = true;
      user.profileCompleted = true;
      await user.save();
    }

    const { token } = await generateToken(user._id, res, req);

    res.status(200).json({ ...buildUserResponse(user), token });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Logout
// ──────────────────────────────────────────────────────────────────────────────

export const logout = async (req, res) => {
  try {
    const token = req.cookies.jwt || req.headers.authorization?.split(" ")[1];
    if (token) {
      const jwt = await import("jsonwebtoken");
      try {
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        if (decoded.jti) {
          await Session.deleteOne({ jti: decoded.jti });
        }
      } catch (_) { /* expired token, ignore */ }
    }
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Update Profile
// ──────────────────────────────────────────────────────────────────────────────

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fullName, profilePic, profile, privacy,
      phone, username, bio, location, dob, gender,
      interests, hobbies, education, work, statusMessage,
    } = req.body;

    const updatePayload = {};

    if (profilePic) {
      if (typeof profilePic === "string" && profilePic.startsWith("data:image")) {
        const uploadResponse = await cloudinary.uploader.upload(profilePic, { folder: "chatty_profiles" });
        updatePayload["profilePic"] = uploadResponse.secure_url;
      } else {
        updatePayload["profilePic"] = profilePic;
      }
    }

    if (fullName && typeof fullName === "string" && fullName.trim().length > 0) {
      updatePayload["fullName"] = fullName.trim();
      updatePayload["profile.displayName"] = fullName.trim();
    }

    const targetUsername = username || profile?.username;
    if (targetUsername) {
      const u = targetUsername.toLowerCase().trim();
      if (!/^[a-z0-9_.]+$/.test(u)) {
        return res.status(400).json({ message: "Username can only contain lowercase letters, numbers, _, and ." });
      }
      const existing = await User.findOne({ $or: [{ "profile.username": u }, { username: u }] });
      if (existing && String(existing._id) !== String(userId)) {
        return res.status(400).json({ message: "Username is already taken by another user." });
      }
      updatePayload["profile.username"] = u;
      updatePayload["username"] = u;
    }

    if (profile && typeof profile === "object") {
      for (const [key, val] of Object.entries(profile)) {
        updatePayload[`profile.${key}`] = val;
      }
    }

    if (bio !== undefined) updatePayload["profile.bio"] = bio;
    if (location !== undefined) updatePayload["profile.location"] = location;
    if (dob !== undefined) updatePayload["profile.dob"] = dob;
    if (gender !== undefined) updatePayload["profile.gender"] = gender;
    if (phone !== undefined) updatePayload["profile.phone"] = phone;
    if (interests !== undefined) updatePayload["profile.interests"] = Array.isArray(interests) ? interests : [interests];
    if (hobbies !== undefined) updatePayload["profile.hobbies"] = Array.isArray(hobbies) ? hobbies : [hobbies];
    if (education !== undefined) updatePayload["profile.education"] = education;
    if (work !== undefined) updatePayload["profile.work"] = work;
    if (statusMessage !== undefined) updatePayload["profile.statusMessage"] = statusMessage;

    if (privacy && typeof privacy === "object") {
      for (const [key, val] of Object.entries(privacy)) {
        updatePayload[`privacy.${key}`] = val;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, { $set: updatePayload }, { new: true }
    ).select("-password -twoFactor.secret -twoFactor.recoveryKeys");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    // Broadcast real-time profile update to all connected socket clients
    io.emit("userProfileUpdated", {
      userId: updatedUser._id,
      updatedUser: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        profilePic: updatedUser.profilePic,
        username: updatedUser.username,
        profile: updatedUser.profile,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("error in update profile:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Check Auth
// ──────────────────────────────────────────────────────────────────────────────

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(buildUserResponse(req.user));
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Change Password
// ──────────────────────────────────────────────────────────────────────────────

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const hashedNew = await bcrypt.hash(newPassword, 12);
    user.password = hashedNew;
    await user.save();

    // Revoke all sessions except current
    const currentJti = req.jti;
    await Session.deleteMany({ userId: req.user._id, jti: { $ne: currentJti } });

    res.status(200).json({ message: "Password changed successfully. Other sessions have been logged out." });
  } catch (error) {
    console.error("Error in changePassword:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Active Sessions
// ──────────────────────────────────────────────────────────────────────────────

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ lastActive: -1 });
    const currentJti = req.jti;
    const result = sessions.map((s) => ({
      _id: s._id,
      device: s.device,
      browser: s.browser,
      os: s.os,
      ip: s.ip,
      loginTime: s.loginTime,
      lastActive: s.lastActive,
      isCurrent: s.jti === currentJti,
    }));
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getSessions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.jti === req.jti) return res.status(400).json({ message: "Cannot terminate current session" });
    await session.deleteOne();
    res.status(200).json({ message: "Session terminated" });
  } catch (error) {
    console.error("Error in terminateSession:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const terminateOtherSessions = async (req, res) => {
  try {
    await Session.deleteMany({ userId: req.user._id, jti: { $ne: req.jti } });
    res.status(200).json({ message: "All other sessions terminated" });
  } catch (error) {
    console.error("Error in terminateOtherSessions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Block / Unblock Users
// ──────────────────────────────────────────────────────────────────────────────

export const blockUser = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    if (String(targetUserId) === String(req.user._id)) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }
    const target = await User.findById(targetUserId);
    if (!target) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: targetUserId } });
    res.status(200).json({ message: "User blocked" });
  } catch (error) {
    console.error("Error in blockUser:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: targetUserId } });
    res.status(200).json({ message: "User unblocked" });
  } catch (error) {
    console.error("Error in unblockUser:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("blockedUsers", "_id fullName profilePic username");
    res.status(200).json(user.blockedUsers || []);
  } catch (error) {
    console.error("Error in getBlockedUsers:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Two-Factor Authentication
// ──────────────────────────────────────────────────────────────────────────────

export const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.twoFactor?.enabled) {
      return res.status(400).json({ message: "2FA is already enabled" });
    }

    const secret = speakeasy.generateSecret({
      name: `Chatty (${user.email})`,
      length: 20,
    });

    // Temporarily store unconfirmed secret
    user.twoFactor = { enabled: false, secret: secret.base32, recoveryKeys: [] };
    await user.save();

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      secret: secret.base32,
      qrCode: qrDataUrl,
      message: "Scan QR with authenticator app, then call verify-2fa to activate",
    });
  } catch (error) {
    console.error("Error in setup2FA:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const user = await User.findById(req.user._id);
    if (!user.twoFactor?.secret) return res.status(400).json({ message: "2FA setup not initiated" });

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactor.secret,
      encoding: "base32",
      token,
      window: 2,
    });

    if (!isValid) return res.status(400).json({ message: "Invalid verification token" });

    // Generate 10 recovery codes
    const recoveryKeys = Array.from({ length: 10 }, () => crypto.randomBytes(6).toString("hex").toUpperCase());

    user.twoFactor.enabled = true;
    user.twoFactor.recoveryKeys = recoveryKeys;
    await user.save();

    res.status(200).json({
      message: "2FA enabled successfully",
      recoveryKeys,
    });
  } catch (error) {
    console.error("Error in verify2FA:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const disable2FA = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required to disable 2FA" });

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    user.twoFactor = { enabled: false, secret: "", recoveryKeys: [] };
    await user.save();

    res.status(200).json({ message: "2FA disabled" });
  } catch (error) {
    console.error("Error in disable2FA:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Profile Statistics
// ──────────────────────────────────────────────────────────────────────────────

export const getProfileStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [messagesSent, mediaShared, activeChatUsers] = await Promise.all([
      Message.countDocuments({ senderId: userId }),
      Message.countDocuments({
        senderId: userId,
        $or: [
          { image: { $ne: null, $ne: "" } },
          { file: { $ne: null, $ne: "" } },
        ],
      }),
      Message.distinct("receiverId", { senderId: userId }),
    ]);

    const activeChats = activeChatUsers.length;

    const accountAgeDays = req.user.createdAt
      ? Math.max(1, Math.floor((new Date() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24)))
      : 1;

    res.status(200).json({
      messagesSent,
      mediaShared,
      activeChats,
      groupRooms: 0, // Groups not yet implemented
      callsMade: 0,  // Will populate once calls are placed via socket
      accountAgeDays,
    });
  } catch (error) {
    console.error("Error in getProfileStats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Storage Calculation
// ──────────────────────────────────────────────────────────────────────────────

export const getStorageStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregate messages with attachments
    const attachments = await Message.find(
      {
        senderId: userId,
        $or: [
          { image: { $ne: null, $ne: "" } },
          { file: { $ne: null, $ne: "" } },
        ],
      },
      { fileType: 1, image: 1, file: 1 }
    ).lean();

    let imagesMB = 0, videosMB = 0, docsMB = 0, voiceNotesMB = 0;

    // Estimate sizes by type (since we store URLs, not file metadata, estimate a reasonable avg)
    // In future, file size metadata should be stored on upload
    attachments.forEach((msg) => {
      const type = msg.fileType || (msg.image ? "image" : "document");
      if (type === "image") imagesMB += 1.5;
      else if (type === "video") videosMB += 20;
      else if (type === "audio") voiceNotesMB += 0.5;
      else docsMB += 0.8;
    });

    const profilePicMB = req.user.profilePic ? 0.3 : 0;
    const totalUsedMB = Math.round(imagesMB + videosMB + docsMB + voiceNotesMB + profilePicMB);

    res.status(200).json({
      totalUsedMB,
      maxMB: 1024,
      imagesMB: Math.round(imagesMB),
      videosMB: Math.round(videosMB),
      docsMB: Math.round(docsMB),
      voiceNotesMB: Math.round(voiceNotesMB),
      cacheMB: 0,
    });
  } catch (error) {
    console.error("Error in getStorageStats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Export Chat Data
// ──────────────────────────────────────────────────────────────────────────────

export const exportChatData = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password -twoFactor.secret -twoFactor.recoveryKeys").lean();

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "fullName email")
      .populate("receiverId", "fullName email")
      .lean();

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        name: user.fullName,
        email: user.email,
        username: user.username,
        bio: user.profile?.bio,
        location: user.profile?.location,
        memberSince: user.createdAt,
      },
      privacy: user.privacy,
      stats: {
        totalMessages: messages.length,
        messagesSent: messages.filter((m) => String(m.senderId?._id) === String(userId)).length,
        messagesReceived: messages.filter((m) => String(m.receiverId?._id) === String(userId)).length,
      },
      messages: messages.map((m) => ({
        from: m.senderId?.fullName || "Unknown",
        to: m.receiverId?.fullName || "Unknown",
        text: m.text || "",
        image: m.image || null,
        file: m.file || null,
        fileType: m.fileType || null,
        timestamp: m.createdAt,
      })),
    };

    res.setHeader("Content-Disposition", `attachment; filename="chatty-export-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(exportData);
  } catch (error) {
    console.error("Error in exportChatData:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Shared Media
// ──────────────────────────────────────────────────────────────────────────────

export const getSharedMedia = async (req, res) => {
  try {
    const requesterId = req.user._id;
    // Support optional userId for public profile media viewing
    const targetUserId = req.query.userId ? req.query.userId : requesterId;
    const { type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // If requesting another user's media, verify they have a conversation (security gate)
    if (String(targetUserId) !== String(requesterId)) {
      const hasConversation = await Message.exists({
        $or: [
          { senderId: requesterId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: requesterId },
        ],
      });
      if (!hasConversation) {
        return res.status(200).json({ items: [], total: 0, page: 1, totalPages: 0, counts: { photos: 0, videos: 0, documents: 0, voiceNotes: 0, links: 0 } });
      }
    }

    // Build base filter — shared between the two users or all own messages
    const baseFilter = String(targetUserId) === String(requesterId)
      ? { $or: [{ senderId: targetUserId }, { receiverId: targetUserId }] }
      : {
          $or: [
            { senderId: requesterId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: requesterId },
          ],
        };

    let filter = { ...baseFilter };

    if (type === "photos") {
      filter = { ...filter, image: { $ne: null, $ne: "" } };
    } else if (type === "videos") {
      filter = { ...filter, fileType: "video" };
    } else if (type === "documents") {
      filter = { ...filter, fileType: { $in: ["document", "pdf"] } };
    } else if (type === "voiceNotes") {
      filter = { ...filter, fileType: "audio" };
    } else if (type === "links") {
      filter = { ...filter, text: { $regex: /https?:\/\//i } };
    }

    const [items, total] = await Promise.all([
      Message.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("senderId", "fullName profilePic")
        .lean(),
      Message.countDocuments(filter),
    ]);

    // Count per type using base filter
    const [photosCount, videosCount, docsCount, voiceCount, linksCount] = await Promise.all([
      Message.countDocuments({ ...baseFilter, image: { $ne: null, $ne: "" } }),
      Message.countDocuments({ ...baseFilter, fileType: "video" }),
      Message.countDocuments({ ...baseFilter, fileType: { $in: ["document", "pdf"] } }),
      Message.countDocuments({ ...baseFilter, fileType: "audio" }),
      Message.countDocuments({ ...baseFilter, text: { $regex: /https?:\/\//i } }),
    ]);

    res.status(200).json({
      items,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      counts: {
        photos: photosCount,
        videos: videosCount,
        documents: docsCount,
        voiceNotes: voiceCount,
        links: linksCount,
      },
    });
  } catch (error) {
    console.error("Error in getSharedMedia:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Delete Account
// ──────────────────────────────────────────────────────────────────────────────

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required to delete account" });

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    // Delete all messages where user is sender or receiver
    await Message.deleteMany({ $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] });

    // Delete all sessions
    await Session.deleteMany({ userId: req.user._id });

    // Delete user doc
    await User.findByIdAndDelete(req.user._id);

    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error in deleteAccount:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// Get Public User Profile (Read-Only)
// ──────────────────────────────────────────────────────────────────────────────

export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user._id;

    const targetUser = await User.findById(userId)
      .select("-password -twoFactor.secret -twoFactor.recoveryKeys -blockedUsers -sessions")
      .lean();
    
    // Separately fetch only what we need for block checks (not sent to client)
    const [viewerDoc, targetBlockList] = await Promise.all([
      User.findById(viewerId).select("blockedUsers").lean(),
      User.findById(userId).select("blockedUsers").lean(),
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isOwnProfile = String(userId) === String(viewerId);

    // Check if viewer is blocked by target user or viewer blocked target user
    const isViewerBlocked = targetBlockList?.blockedUsers?.some((b) => String(b) === String(viewerId));
    const isTargetBlockedByViewer = viewerDoc?.blockedUsers?.some((b) => String(b) === String(userId));

    const p = targetUser.privacy || {};

    const publicProfile = {
      _id: targetUser._id,
      fullName: targetUser.fullName,
      username: targetUser.username || targetUser.profile?.username || "",
      profilePic: targetUser.profilePic,
      createdAt: targetUser.createdAt,
      isOwnProfile,
      isBlocked: isTargetBlockedByViewer,
      profile: {
        bio: targetUser.profile?.bio || "Available",
        statusMessage: targetUser.profile?.statusMessage || "",
        location: targetUser.profile?.location || "",
        gender: targetUser.profile?.gender || "",
        dob: targetUser.profile?.dob || "",
        work: targetUser.profile?.work || "",
        education: targetUser.profile?.education || "",
        interests: targetUser.profile?.interests || [],
        hobbies: targetUser.profile?.hobbies || [],
      },
    };

    // Apply Privacy Settings Server-Side if not own profile
    if (!isOwnProfile) {
      if (p.profilePhotoVisibility === "Nobody" || isViewerBlocked) {
        publicProfile.profilePic = "";
      }

      if (p.aboutVisibility === "Nobody" || isViewerBlocked) {
        publicProfile.profile.bio = "";
        publicProfile.profile.statusMessage = "";
      }

      if (p.birthdayVisibility === "Nobody" || isViewerBlocked) {
        publicProfile.profile.dob = "";
      }
    }

    // Public Statistics
    const [messagesSent, mediaShared] = await Promise.all([
      Message.countDocuments({ senderId: userId }),
      Message.countDocuments({
        senderId: userId,
        $or: [{ image: { $ne: null, $ne: "" } }, { file: { $ne: null, $ne: "" } }],
      }),
    ]);

    const accountAgeDays = targetUser.createdAt
      ? Math.max(1, Math.floor((new Date() - new Date(targetUser.createdAt)) / (1000 * 60 * 60 * 24)))
      : 1;

    publicProfile.stats = {
      messagesSent: isOwnProfile ? messagesSent : (p?.aboutVisibility === "Nobody" ? "—" : messagesSent),
      mediaShared: isOwnProfile ? mediaShared : (p?.aboutVisibility === "Nobody" ? "—" : mediaShared),
      accountAgeDays,
    };

    res.status(200).json(publicProfile);
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
