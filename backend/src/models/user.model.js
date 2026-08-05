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

    // ─── Extended Profile ────────────────────────────────────────────────────
    profile: {
      firstName: { type: String, default: "" },
      lastName: { type: String, default: "" },
      displayName: { type: String, default: "" },
      username: { type: String, default: "", unique: true, sparse: true },
      bio: { type: String, default: "", maxlength: 150 },
      dob: { type: String, default: "" },
      gender: { type: String, default: "" },
      location: { type: String, default: "" },
      statusMessage: { type: String, default: "" },
      phone: { type: String, default: "" },
    },

    // ─── Privacy Preferences ─────────────────────────────────────────────────
    privacy: {
      profilePhotoVisibility: { type: String, default: "Everyone" },
      lastSeenVisibility: { type: String, default: "Everyone" },
      groupInvitePermission: { type: String, default: "Everyone" },
      birthdayVisibility: { type: String, default: "Contacts" },
    },

    // ─── Onboarding Flow ─────────────────────────────────────────────────────
    onboardingStep: { type: Number, default: 0 },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
