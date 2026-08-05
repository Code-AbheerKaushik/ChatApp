import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ─── Core Auth Fields (unchanged) ───────────────────────────────────────
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      default: "",
    },

    // ─── Extended Profile ────────────────────────────────────────────────────
    profile: {
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      displayName: { type: String, default: "" },
      username: { type: String, default: "", unique: true, sparse: true },
      bio: { type: String, default: "Available", maxlength: 150 },
      dob: { type: String, default: "" },
      gender: { type: String, default: "" },
      location: { type: String, default: "" },
      statusMessage: { type: String, default: "Can't talk, chat only 💬" },
      phone: { type: String, default: "" },
      interests: { type: [String], default: [] },
      hobbies: { type: [String], default: [] },
      education: { type: String, default: "" },
      work: { type: String, default: "" },
    },

    // ─── Privacy Preferences ─────────────────────────────────────────────────
    privacy: {
      profilePhotoVisibility: { type: String, default: "Everyone" },
      lastSeenVisibility: { type: String, default: "Everyone" },
      groupInvitePermission: { type: String, default: "Everyone" },
      birthdayVisibility: { type: String, default: "Contacts" },
      onlineStatusVisibility: { type: String, default: "Everyone" },
      aboutVisibility: { type: String, default: "Everyone" },
      allowGroupInvites: { type: String, default: "Everyone" },
      readReceipts: { type: Boolean, default: true },
      typingIndicator: { type: Boolean, default: true },
    },

    // ─── Blocked Users List ──────────────────────────────────────────────────
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ─── Two Factor Authentication ───────────────────────────────────────────
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, default: "" },
      recoveryKeys: { type: [String], default: [] },
    },

    // ─── Onboarding & Profile State ──────────────────────────────────────────
    onboardingStep: { type: Number, default: 0 },
    onboardingComplete: { type: Boolean, default: false },
    profileCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
