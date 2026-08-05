import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";
import { useAuthStore } from "./useAuthStore";

const loadLocal = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const saveLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
};

export const useProfileStore = create((set, get) => ({
  // ─── Extra Profile
  extraProfile: {},
  updateExtraProfile: async (updates) => {
    try {
      await useAuthStore.getState().updateProfile(updates);
      set({ extraProfile: updates });
    } catch { /* handled by authStore */ }
  },

  // ─── Privacy Settings (persisted in MongoDB via updateProfile)
  privacy: {
    lastSeen: "Everyone",
    onlineStatus: "Everyone",
    profilePhoto: "Everyone",
    aboutVisibility: "Everyone",
    readReceipts: true,
    typingIndicator: true,
    twoFactorEnabled: false,
  },

  updatePrivacy: async (key, value) => {
    const prev = get().privacy;
    set({ privacy: { ...prev, [key]: value } }); // optimistic
    try {
      await useAuthStore.getState().updateProfile({ privacy: { [key]: value } });
      toast.success("Privacy setting updated");
    } catch {
      set({ privacy: prev }); // rollback on failure
      toast.error("Failed to update privacy setting");
    }
  },

  loadPrivacyFromUser: (user) => {
    if (!user?.privacy) return;
    set({
      privacy: {
        lastSeen: user.privacy.lastSeenVisibility || "Everyone",
        onlineStatus: user.privacy.onlineStatusVisibility || "Everyone",
        profilePhoto: user.privacy.profilePhotoVisibility || "Everyone",
        aboutVisibility: user.privacy.aboutVisibility || "Everyone",
        readReceipts: user.privacy.readReceipts ?? true,
        typingIndicator: user.privacy.typingIndicator ?? true,
        twoFactorEnabled: user.twoFactor?.enabled ?? false,
      },
    });
  },

  // ─── Notifications Settings (localStorage only, no backend equivalent yet)
  notifications: loadLocal("chatty_notifications", {
    messageNotifications: true,
    groupNotifications: true,
    callNotifications: true,
    sound: true,
    vibration: true,
    notificationPreview: true,
    muteAll: false,
  }),

  updateNotification: (key, value) => {
    const current = get().notifications;
    let updated;
    if (key === "muteAll") {
      updated = { ...current, muteAll: value, messageNotifications: !value, groupNotifications: !value, callNotifications: !value };
    } else {
      updated = { ...current, [key]: value, muteAll: false };
    }
    saveLocal("chatty_notifications", updated);
    set({ notifications: updated });
    toast.success("Notification preference updated");
  },

  // ─── Appearance (localStorage)
  appearance: loadLocal("chatty_appearance", {
    fontSize: "Medium",
    wallpaper: "default",
    bubbleStyle: "rounded",
    messageDensity: "comfortable",
    accentColor: "#6366f1",
  }),
  updateAppearance: (key, value) => {
    const updated = { ...get().appearance, [key]: value };
    saveLocal("chatty_appearance", updated);
    set({ appearance: updated });
    toast.success("Appearance updated");
  },

  // ─── Storage Stats (from backend)
  storageStats: {
    totalUsedMB: 0,
    maxMB: 1024,
    imagesMB: 0,
    videosMB: 0,
    docsMB: 0,
    voiceNotesMB: 0,
    cacheMB: 0,
  },
  isLoadingStorage: false,

  fetchStorageStats: async () => {
    set({ isLoadingStorage: true });
    try {
      const res = await axiosInstance.get("/auth/storage-stats");
      set({ storageStats: res.data });
    } catch (error) {
      console.error("Failed to fetch storage stats:", error);
    } finally {
      set({ isLoadingStorage: false });
    }
  },

  clearCache: () => {
    // Clear browser caches
    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    // Clear localStorage cache keys (not auth/settings)
    ["chatty_media_cache"].forEach((key) => localStorage.removeItem(key));
    set((state) => ({
      storageStats: { ...state.storageStats, cacheMB: 0 },
    }));
    toast.success("Cache cleared successfully!");
  },

  exportChatData: async () => {
    try {
      const res = await axiosInstance.get("/auth/export-data", { responseType: "json" });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `chatty_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Chat data exported successfully!");
    } catch (error) {
      toast.error("Export failed. Please try again.");
    }
  },

  // ─── Profile Stats
  profileStats: {
    messagesSent: 0,
    mediaShared: 0,
    activeChats: 0,
    groupRooms: 0,
    callsMade: 0,
    accountAgeDays: 1,
  },
  isLoadingStats: false,

  fetchProfileStats: async () => {
    set({ isLoadingStats: true });
    try {
      const res = await axiosInstance.get("/auth/profile-stats");
      set({ profileStats: res.data });
    } catch (error) {
      console.error("Failed to fetch profile stats:", error);
    } finally {
      set({ isLoadingStats: false });
    }
  },

  // ─── Shared Media
  sharedMedia: {
    items: [],
    total: 0,
    page: 1,
    totalPages: 1,
    counts: { photos: 0, videos: 0, documents: 0, voiceNotes: 0, links: 0 },
  },
  isLoadingMedia: false,

  fetchSharedMedia: async (type = "photos", page = 1) => {
    set({ isLoadingMedia: true });
    try {
      const res = await axiosInstance.get(`/auth/shared-media?type=${type}&page=${page}&limit=20`);
      set({ sharedMedia: res.data });
    } catch (error) {
      console.error("Failed to fetch shared media:", error);
    } finally {
      set({ isLoadingMedia: false });
    }
  },

  // ─── Blocked Users (from backend)
  blockedUsers: [],
  isLoadingBlocked: false,

  fetchBlockedUsers: async () => {
    set({ isLoadingBlocked: true });
    try {
      const res = await axiosInstance.get("/auth/blocked");
      set({ blockedUsers: res.data });
    } catch (error) {
      console.error("Failed to fetch blocked users:", error);
    } finally {
      set({ isLoadingBlocked: false });
    }
  },

  blockUser: async (targetUserId) => {
    try {
      await axiosInstance.post(`/auth/block/${targetUserId}`);
      toast.success("User blocked");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to block user");
    }
  },

  unblockUser: async (targetUserId) => {
    const prev = get().blockedUsers;
    set({ blockedUsers: prev.filter((u) => String(u._id) !== String(targetUserId)) });
    try {
      await axiosInstance.post(`/auth/unblock/${targetUserId}`);
      toast.success("User unblocked");
    } catch (error) {
      set({ blockedUsers: prev });
      toast.error(error.response?.data?.message || "Failed to unblock user");
    }
  },

  // ─── Active Sessions (from backend)
  activeSessions: [],
  isLoadingSessions: false,

  fetchActiveSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const res = await axiosInstance.get("/auth/sessions");
      set({ activeSessions: res.data });
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  terminateSession: async (sessionId) => {
    const prev = get().activeSessions;
    set({ activeSessions: prev.filter((s) => String(s._id) !== String(sessionId)) });
    try {
      await axiosInstance.delete(`/auth/sessions/${sessionId}`);
      toast.success("Session terminated");
    } catch (error) {
      set({ activeSessions: prev });
      toast.error(error.response?.data?.message || "Failed to terminate session");
    }
  },

  terminateOtherSessions: async () => {
    const prev = get().activeSessions;
    set({ activeSessions: prev.filter((s) => s.isCurrent) });
    try {
      await axiosInstance.delete("/auth/sessions");
      toast.success("Logged out from all other devices");
    } catch (error) {
      set({ activeSessions: prev });
      toast.error("Failed to terminate sessions");
    }
  },

  // ─── Change Password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const res = await axiosInstance.put("/auth/change-password", { currentPassword, newPassword });
      toast.success(res.data.message || "Password changed successfully");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
      return false;
    }
  },

  // ─── Delete Account
  deleteAccount: async (password) => {
    try {
      await axiosInstance.delete("/auth/delete-account", { data: { password } });
      toast.success("Account deleted successfully");
      useAuthStore.getState().disconnectSocket();
      useAuthStore.setState({ authUser: null });
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
      return false;
    }
  },

  // ─── 2FA
  twoFactorSetupData: null,
  isSetup2FA: false,

  setup2FA: async () => {
    set({ isSetup2FA: true });
    try {
      const res = await axiosInstance.post("/auth/2fa/setup");
      set({ twoFactorSetupData: res.data });
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to setup 2FA");
      return null;
    } finally {
      set({ isSetup2FA: false });
    }
  },

  verify2FA: async (token) => {
    try {
      const res = await axiosInstance.post("/auth/2fa/verify", { token });
      // Update authUser 2FA status
      useAuthStore.setState((state) => ({
        authUser: { ...state.authUser, twoFactor: { enabled: true } },
      }));
      set({ twoFactorSetupData: null });
      toast.success("2FA enabled successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid 2FA token");
      return null;
    }
  },

  disable2FA: async (password) => {
    try {
      await axiosInstance.post("/auth/2fa/disable", { password });
      useAuthStore.setState((state) => ({
        authUser: { ...state.authUser, twoFactor: { enabled: false } },
      }));
      toast.success("2FA disabled");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to disable 2FA");
      return false;
    }
  },

  // ─── Active Modal Control
  activeModal: null,
  modalData: null,
  openModal: (modalName, data = null) => set({ activeModal: modalName, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}));
