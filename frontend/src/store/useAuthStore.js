import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { auth } from "../lib/firebase.js";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : import.meta.env.MODE === "development"
  ? "http://localhost:5001"
  : "https://chatapp-9yga.onrender.com";

// ── Firebase error code → user-friendly message ──────────────────────────────
function parseFBError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-phone-number":      "Invalid phone number. Use international format (e.g. +1234567890).",
    "auth/too-many-requests":         "Too many requests. Please wait a moment before trying again.",
    "auth/invalid-verification-code": "Incorrect OTP code. Please check and try again.",
    "auth/code-expired":              "OTP expired. Please request a new code.",
    "auth/session-expired":           "Session expired. Please resend the OTP.",
    "auth/missing-phone-number":      "Phone number is required.",
    "auth/quota-exceeded":            "SMS quota exceeded. Please try again later.",
    "auth/captcha-check-failed":      "reCAPTCHA verification failed. Please refresh and try again.",
    "auth/network-request-failed":    "Network error. Check your connection and try again.",
    "auth/missing-verification-code": "Please enter the OTP code.",
    "auth/user-disabled":             "This phone number has been disabled.",
  };
  return map[code] || error?.message || "An unexpected error occurred. Please try again.";
}

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  isSendingOtp: false,
  isVerifyingOtp: false,
  onlineUsers: [],
  socket: null,
  // Holds the Firebase ConfirmationResult after sendOtp succeeds
  confirmationResult: null,

  // ── Create or reuse the invisible reCAPTCHA verifier ─────────────────────────
  _getRecaptchaVerifier: (containerId = "recaptcha-container") => {
    if (window._recaptchaVerifier && window._recaptchaVerifier.widgetId != null) {
      return window._recaptchaVerifier;
    }

    // Clear any stale verifier before creating a new one
    if (window._recaptchaVerifier) {
      try { window._recaptchaVerifier.clear(); } catch (_) {}
      window._recaptchaVerifier = null;
    }

    window._recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        try { window._recaptchaVerifier?.clear(); } catch (_) {}
        window._recaptchaVerifier = null;
      },
    });

    return window._recaptchaVerifier;
  },

  // ── Send OTP via Firebase Phone Auth ─────────────────────────────────────────
  sendOtp: async (phone) => {
    set({ isSendingOtp: true });
    try {
      const verifier = get()._getRecaptchaVerifier("recaptcha-container");
      const confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
      set({ confirmationResult });
      toast.success("OTP sent! Check your SMS.");
      return true;
    } catch (error) {
      console.error("Firebase sendOtp error:", error);
      // Reset reCAPTCHA so the next send attempt gets a fresh challenge
      try { window._recaptchaVerifier?.clear(); } catch (_) {}
      window._recaptchaVerifier = null;
      toast.error(parseFBError(error));
      return false;
    } finally {
      set({ isSendingOtp: false });
    }
  },

  // ── Resend OTP — clears stale reCAPTCHA and re-triggers sendOtp ──────────────
  resendOtp: async (phone) => {
    try { window._recaptchaVerifier?.clear(); } catch (_) {}
    window._recaptchaVerifier = null;
    set({ confirmationResult: null });
    return get().sendOtp(phone);
  },

  // ── Verify OTP and return Firebase ID token ───────────────────────────────────
  verifyOtp: async (code) => {
    const { confirmationResult } = get();
    if (!confirmationResult) {
      toast.error("Please request an OTP first.");
      return null;
    }
    set({ isVerifyingOtp: true });
    try {
      const result = await confirmationResult.confirm(code);
      // The Firebase ID token is sent to our backend for secure verification
      const idToken = await result.user.getIdToken();
      toast.success("Phone verified successfully!");
      return { idToken, phone: result.user.phoneNumber };
    } catch (error) {
      console.error("Firebase verifyOtp error:", error);
      toast.error(parseFBError(error));
      return null;
    } finally {
      set({ isVerifyingOtp: false });
    }
  },

  setAuthUser: (user) => set({ authUser: user }),

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      if (res.data.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      if (res.data.token) localStorage.setItem("token", res.data.token);
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed. Please check network connection.");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("token");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response?.data?.message || "Profile update failed.");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
      withCredentials: true,
    });
    socket.connect();
    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    import("./useChatStore.js").then(({ useChatStore }) => {
      useChatStore.getState().initGlobalSocketListeners(socket);
    });

    socket.on("userProfileUpdated", ({ userId, updatedUser }) => {
      const { authUser } = get();
      if (authUser && String(authUser._id) === String(userId)) {
        set((state) => ({
          authUser: {
            ...state.authUser,
            fullName: updatedUser.fullName ?? state.authUser.fullName,
            profilePic: updatedUser.profilePic ?? state.authUser.profilePic,
            username: updatedUser.username ?? state.authUser.username,
            profile: { ...state.authUser.profile, ...updatedUser.profile },
          },
        }));
      }
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
