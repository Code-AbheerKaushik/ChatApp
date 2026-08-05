import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

const DRAFT_KEY = "chatty_onboarding_draft";

const loadDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};
  } catch {
    return {};
  }
};

const saveDraft = (data) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
};

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY);
};

// Total number of steps (0 = welcome, 9 = preview)
export const TOTAL_STEPS = 9;

export const useOnboardingStore = create((set, get) => ({
  // Current step index (0–8)
  currentStep: 0,

  // Whether we are saving to backend
  isSavingStep: false,

  // Username availability state
  isCheckingUsername: false,
  usernameAvailable: null, // true | false | null

  // Draft data being built during the wizard
  draft: loadDraft(),

  // ─── Step Navigation ──────────────────────────────────────────────────────

  goToStep: (step) => set({ currentStep: step }),

  nextStep: () =>
    set((s) => ({ currentStep: Math.min(s.currentStep + 1, TOTAL_STEPS) })),

  prevStep: () =>
    set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),

  // ─── Draft Management ─────────────────────────────────────────────────────

  updateDraft: (updates) => {
    const next = { ...get().draft, ...updates };
    saveDraft(next);
    set({ draft: next });
  },

  // ─── Username Check ───────────────────────────────────────────────────────

  checkUsername: async (username) => {
    if (!username || username.length < 3) {
      set({ usernameAvailable: null });
      return;
    }
    set({ isCheckingUsername: true, usernameAvailable: null });
    try {
      const res = await axiosInstance.get(`/auth/check-username?u=${username}`);
      set({ usernameAvailable: res.data.available });
    } catch {
      set({ usernameAvailable: null });
    } finally {
      set({ isCheckingUsername: false });
    }
  },

  // ─── Save Step to Backend ─────────────────────────────────────────────────

  saveStep: async (step, payload) => {
    set({ isSavingStep: true });
    try {
      const res = await axiosInstance.put("/auth/onboarding", {
        step,
        ...payload,
      });
      // Return updated user so caller can update authUser
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save. Try again.");
      throw error;
    } finally {
      set({ isSavingStep: false });
    }
  },

  // ─── Complete Onboarding ──────────────────────────────────────────────────

  completeOnboarding: async () => {
    set({ isSavingStep: true });
    try {
      const res = await axiosInstance.put("/auth/onboarding", {
        step: TOTAL_STEPS,
        onboardingComplete: true,
      });
      clearDraft();
      return res.data;
    } catch (error) {
      toast.error("Failed to complete setup. Try again.");
      throw error;
    } finally {
      set({ isSavingStep: false });
    }
  },

  // ─── Resume from Backend ──────────────────────────────────────────────────

  resumeFromUser: (authUser) => {
    if (authUser?.onboardingStep) {
      set({ currentStep: authUser.onboardingStep });
    }
    // Pre-fill draft from saved authUser profile data
    const draft = loadDraft();
    const merged = {
      firstName: authUser?.profile?.firstName || "",
      lastName: authUser?.profile?.lastName || "",
      username: authUser?.profile?.username || "",
      bio: authUser?.profile?.bio || "",
      dob: authUser?.profile?.dob || "",
      gender: authUser?.profile?.gender || "",
      location: authUser?.profile?.location || "",
      profilePhotoVisibility: authUser?.privacy?.profilePhotoVisibility || "Everyone",
      lastSeenVisibility: authUser?.privacy?.lastSeenVisibility || "Everyone",
      groupInvitePermission: authUser?.privacy?.groupInvitePermission || "Everyone",
      birthdayVisibility: authUser?.privacy?.birthdayVisibility || "Contacts",
      profilePic: authUser?.profilePic || "",
      ...draft, // local draft overrides (more recent)
    };
    saveDraft(merged);
    set({ draft: merged });
  },

  // ─── Reset ────────────────────────────────────────────────────────────────

  reset: () => {
    clearDraft();
    set({ currentStep: 0, draft: {}, usernameAvailable: null });
  },
}));
