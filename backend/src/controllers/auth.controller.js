import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      const token = generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
        profile: newUser.profile,
        privacy: newUser.privacy,
        onboardingStep: newUser.onboardingStep,
        onboardingComplete: newUser.onboardingComplete ?? false,
        token,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      profile: user.profile,
      privacy: user.privacy,
      onboardingStep: user.onboardingStep,
      onboardingComplete: user.onboardingComplete ?? false,
      token,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fullName,
      profilePic,
      profile,
      privacy,
      phone,
      username,
      bio,
      location,
      dob,
      gender,
      interests,
      hobbies,
      education,
      work,
      statusMessage,
    } = req.body;

    const updatePayload = {};

    // 1. Profile Picture upload to Cloudinary (if string base64 / new file provided)
    if (profilePic) {
      if (typeof profilePic === "string" && profilePic.startsWith("data:image")) {
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
          folder: "chatty_profiles",
        });
        updatePayload["profilePic"] = uploadResponse.secure_url;
      } else {
        updatePayload["profilePic"] = profilePic;
      }
    }

    // 2. Direct top-level fullName update
    if (fullName && typeof fullName === "string" && fullName.trim().length > 0) {
      updatePayload["fullName"] = fullName.trim();
      updatePayload["profile.displayName"] = fullName.trim();
    }

    // 3. Username uniqueness check
    const targetUsername = username || profile?.username;
    if (targetUsername) {
      const u = targetUsername.toLowerCase().trim();
      if (!/^[a-z0-9_.]+$/.test(u)) {
        return res.status(400).json({ message: "Username can only contain lowercase letters, numbers, _, and ." });
      }
      const existing = await User.findOne({
        $or: [{ "profile.username": u }, { username: u }],
      });
      if (existing && String(existing._id) !== String(userId)) {
        return res.status(400).json({ message: "Username is already taken by another user." });
      }
      updatePayload["profile.username"] = u;
      updatePayload["username"] = u;
    }

    // 4. Update profile object & individual fields
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

    // 5. Update privacy preferences if provided
    if (privacy && typeof privacy === "object") {
      for (const [key, val] of Object.entries(privacy)) {
        updatePayload[`privacy.${key}`] = val;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatePayload },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("error in update profile:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
