import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : import.meta.env.MODE === "development"
  ? "http://localhost:5001"
  : "https://chatapp-9yga.onrender.com";

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

  sendOtp: async (phone) => {
    set({ isSendingOtp: true });
    try {
      const res = await axiosInstance.post("/auth/send-otp", { phone });
      toast.success(res.data.message || "OTP sent successfully!");
      if (res.data.devOtp) {
        toast(`DEV OTP Code: ${res.data.devOtp}`, { icon: "🔑", duration: 8000 });
      }
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP.");
      return false;
    } finally {
      set({ isSendingOtp: false });
    }
  },

  verifyOtp: async (phone, otp) => {
    set({ isVerifyingOtp: true });
    try {
      const res = await axiosInstance.post("/auth/verify-otp", { phone, otp });
      toast.success(res.data.message || "Phone verified successfully!");
      return res.data; // contains verificationToken
    } catch (error) {
      toast.error(error.response?.data?.message || "OTP verification failed.");
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
      query: {
        userId: authUser._id,
      },
      withCredentials: true,
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // Real-time profile update: update contacts in chat lists if their profile changes
    socket.on("userProfileUpdated", ({ userId, updatedUser }) => {
      // Update authUser if it's our own profile updated from another device
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
