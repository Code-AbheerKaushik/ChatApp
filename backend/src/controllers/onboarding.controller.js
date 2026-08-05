import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

/**
 * PUT /auth/onboarding
 * Saves one step of the onboarding wizard and persists it to the DB.
 * Body: { step, profile?, privacy?, profilePic?, onboardingComplete? }
 */
export const saveOnboardingStep = async (req, res) => {
  try {
    const userId = req.user._id;
    const { step, profile, privacy, profilePic, onboardingComplete } = req.body;

    const updatePayload = {};

    // Merge nested profile fields
    if (profile && typeof profile === "object") {
      for (const [key, value] of Object.entries(profile)) {
        updatePayload[`profile.${key}`] = value;
      }
      // Keep fullName in sync with displayName when name is set
      if (profile.firstName || profile.lastName) {
        const existing = await User.findById(userId).select("profile.firstName profile.lastName");
        const first = profile.firstName ?? existing?.profile?.firstName ?? "";
        const last = profile.lastName ?? existing?.profile?.lastName ?? "";
        const display = `${first} ${last}`.trim();
        updatePayload["profile.displayName"] = display;
        updatePayload["fullName"] = display || existing?.fullName || "";
      }
    }

    // Merge nested privacy fields
    if (privacy && typeof privacy === "object") {
      for (const [key, value] of Object.entries(privacy)) {
        updatePayload[`privacy.${key}`] = value;
      }
    }

    // Handle profile picture upload to Cloudinary
    if (profilePic) {
      const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        folder: "chatty_profiles",
      });
      updatePayload["profilePic"] = uploadResponse.secure_url;
    }

    // Track onboarding progress
    if (typeof step === "number") {
      updatePayload["onboardingStep"] = step;
    }
    if (onboardingComplete === true) {
      updatePayload["onboardingComplete"] = true;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatePayload },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error in saveOnboardingStep:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /auth/check-username?u=xyz
 * Returns whether a username is available.
 */
export const checkUsernameAvailability = async (req, res) => {
  try {
    const { u } = req.query;

    if (!u || u.length < 3) {
      return res.status(400).json({ available: false, message: "Username too short" });
    }
    if (u.length > 20) {
      return res.status(400).json({ available: false, message: "Username too long" });
    }
    if (!/^[a-z0-9_.]+$/.test(u)) {
      return res.status(400).json({ available: false, message: "Only lowercase letters, numbers, _ and . allowed" });
    }

    const existing = await User.findOne({ "profile.username": u });
    if (existing && String(existing._id) !== String(req.user._id)) {
      return res.status(200).json({ available: false });
    }

    return res.status(200).json({ available: true });
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
