import { create } from "zustand";
import toast from "react-hot-toast";
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
  // --- Extra Profile Fields (Persisted via MongoDB authUser) ---
  extraProfile: {},

  updateExtraProfile: async (updates) => {
    try {
      await useAuthStore.getState().updateProfile(updates);
      set({ extraProfile: updates });
    } catch {
      // handled by authStore error toast
    }
  },

  // --- Privacy Settings ---
  privacy: loadLocal("chatty_privacy", {
    lastSeen: "Everyone", // "Everyone" | "Contacts" | "Nobody"
    onlineStatus: "Everyone",
    profilePhoto: "Everyone",
    aboutVisibility: "Everyone",
    readReceipts: true,
    typingIndicator: true,
    twoFactorEnabled: false,
  }),

  updatePrivacy: (key, value) => {
    const updated = { ...get().privacy, [key]: value };
    saveLocal("chatty_privacy", updated);
    set({ privacy: updated });
    toast.success("Privacy setting updated");
  },

  // --- Notifications Settings ---
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
      updated = {
        ...current,
        muteAll: value,
        messageNotifications: !value,
        groupNotifications: !value,
        callNotifications: !value,
      };
    } else {
      updated = { ...current, [key]: value, muteAll: false };
    }
    saveLocal("chatty_notifications", updated);
    set({ notifications: updated });
    toast.success("Notification preference updated");
  },

  // --- Appearance & Layout Config ---
  appearance: loadLocal("chatty_appearance", {
    fontSize: "Medium", // "Small" | "Medium" | "Large"
    wallpaper: "default", // "default" | "gradient" | "pattern" | "dark"
    bubbleStyle: "rounded", // "rounded" | "glass" | "classic"
    messageDensity: "comfortable", // "compact" | "comfortable"
    accentColor: "#6366f1",
  }),

  updateAppearance: (key, value) => {
    const updated = { ...get().appearance, [key]: value };
    saveLocal("chatty_appearance", updated);
    set({ appearance: updated });
    toast.success("Appearance updated");
  },

  // --- Storage Data Metrics ---
  storageStats: {
    totalUsedMB: 428,
    maxMB: 1024,
    imagesMB: 215,
    videosMB: 140,
    docsMB: 48,
    voiceNotesMB: 15,
    cacheMB: 10,
  },

  clearCache: () => {
    set((state) => ({
      storageStats: { ...state.storageStats, cacheMB: 0, totalUsedMB: Math.max(0, state.storageStats.totalUsedMB - state.storageStats.cacheMB) },
    }));
    toast.success("Cache cleared successfully!");
  },

  exportChatData: () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      exportDate: new Date().toISOString(),
      user: get().extraProfile,
      privacy: get().privacy,
      notifications: get().notifications,
      app: "Chatty Messenger Backup"
    }));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chatty_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Export file generated & downloading");
  },

  // --- Blocked Contacts & Active Devices ---
  blockedUsers: [
    { id: "b1", name: "Spam Bot", email: "spambot@example.com", date: "2026-01-10" },
    { id: "b2", name: "Telemarketer", email: "marketing@promo.com", date: "2026-02-14" },
  ],

  unblockUser: (id) => {
    set((state) => ({
      blockedUsers: state.blockedUsers.filter((u) => u.id !== id),
    }));
    toast.success("User unblocked");
  },

  activeSessions: [
    { id: "s1", device: "Chrome on Windows 11", location: "San Francisco, US", ip: "192.168.1.45", isCurrent: true, lastActive: "Active Now" },
    { id: "s2", device: "Chatty iOS App - iPhone 15 Pro", location: "San Francisco, US", ip: "172.56.21.9", isCurrent: false, lastActive: "2 hours ago" },
    { id: "s3", device: "Firefox on macOS Sonoma", location: "San Jose, US", ip: "192.168.2.11", isCurrent: false, lastActive: "Yesterday at 14:20" },
  ],

  terminateSession: (id) => {
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== id),
    }));
    toast.success("Session terminated");
  },

  terminateOtherSessions: () => {
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.isCurrent),
    }));
    toast.success("Logged out from all other devices");
  },

  // --- Active Modal Control ---
  activeModal: null, // "editProfile" | "qrCode" | "privacyModal" | "sessionsModal" | "blockedModal" | "changePassword" | "mediaGallery" | "deleteAccount"
  modalData: null,

  openModal: (modalName, data = null) => set({ activeModal: modalName, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}));
