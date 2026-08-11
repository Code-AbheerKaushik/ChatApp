import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

// ─── Exit Confirmation Dialog ─────────────────────────────────────────────────
// Mobile-friendly, accessible dialog matching DaisyUI base tokens.
// Prevents interaction with the Home page behind it while open.
const ExitConfirmDialog = ({ isOpen, onCancel, onExit }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      id="exit-confirm-dialog-overlay"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dlg-title"
    >
      <div
        className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="p-4 rounded-full bg-error/10 mb-4">
            <LogOut className="size-7 text-error" />
          </div>
          <h2 id="exit-dlg-title" className="text-base font-bold text-base-content mb-1 text-center">
            Exit App?
          </h2>
          <p className="text-sm text-base-content/60 text-center leading-snug">
            Are you sure you want to exit the application?
          </p>
        </div>

        <div className="flex border-t border-base-300">
          <button
            id="exit-dlg-cancel"
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-semibold text-base-content/70 hover:bg-base-200 transition-colors border-r border-base-300"
          >
            Cancel
          </button>
          <button
            id="exit-dlg-exit"
            onClick={onExit}
            autoFocus
            className="flex-1 py-4 text-sm font-bold text-error hover:bg-error/5 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── useBackHandler ───────────────────────────────────────────────────────────
// Single, centralized source of truth for Back-button navigation.
//
// Decision Flow on Back Press:
// 1. If Keyboard / Active Input is open → Blur input, stop processing.
// 2. If Modal / Popup / Mobile Chat View is open → Close UI overlay, stop.
// 3. If Current Page is NOT Home ("/") → Navigate back immediately, stop.
// 4. If Current Page IS Home ("/") → Immediately show Exit Confirmation Dialog.
// ─────────────────────────────────────────────────────────────────────────────

const HOME_PATH = "/";
const SENTINEL_KEY = "_appHomeSentinel";

export const useBackHandler = () => {
  const location = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Ref tracking current pathname BEFORE popstate handling
  const currentPathRef = useRef(location.pathname);

  // Synchronously update currentPathRef whenever location changes
  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  // Push sentinel history state on Home mount so back press on Home is intercepted
  useEffect(() => {
    if (location.pathname === HOME_PATH && !window.history.state?.[SENTINEL_KEY]) {
      window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
    }
  }, [location.pathname]);

  // Helper: Check and handle open keyboard or UI overlays (modals, lightboxes, mobile chats)
  const checkAndCloseOverlay = useCallback(() => {
    // 1. Keyboard / Active text input focus
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.isContentEditable)) {
      activeEl.blur();
      return true;
    }

    // 2. Mobile chat view (selected user or selected group)
    const { selectedUser, setSelectedUser } = useChatStore.getState();
    const { selectedGroup, setSelectedGroup, createGroupModalOpen, setCreateGroupModalOpen, groupSettingsModalOpen, setGroupSettingsModalOpen } = useGroupStore.getState();

    if (selectedUser) {
      setSelectedUser(null);
      return true;
    }
    if (selectedGroup) {
      setSelectedGroup(null);
      return true;
    }
    if (createGroupModalOpen) {
      setCreateGroupModalOpen(false);
      return true;
    }
    if (groupSettingsModalOpen) {
      setGroupSettingsModalOpen(false);
      return true;
    }

    // 3. Open DOM Modals / Lightboxes (elements with fixed inset-0 overlay excluding exit dialog)
    const openOverlay = document.querySelector(
      ".fixed.inset-0:not(#exit-confirm-dialog-overlay)"
    );
    if (openOverlay) {
      // Dispatch Escape key event to trigger active modal close listeners
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
      return true;
    }

    return false;
  }, []);

  // Main Back listener (registered once)
  useEffect(() => {
    const handlePopState = (e) => {
      const pageBeforeBack = currentPathRef.current;

      // ── Step 1 & 2: Check Keyboard or Open UI Overlays ──────────────────
      const overlayWasClosed = checkAndCloseOverlay();
      if (overlayWasClosed) {
        // Re-push sentinel if on Home so future back presses are still intercepted
        if (pageBeforeBack === HOME_PATH) {
          window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
        }
        return;
      }

      // ── Step 3: Inner Page Case (pageBeforeBack !== "/") ─────────────────
      // If user was on an inner page (Profile, Settings, User Detail, etc.),
      // allow natural browser/router back navigation. DO NOT show exit prompt.
      if (pageBeforeBack !== HOME_PATH) {
        return;
      }

      // ── Step 4: Home Page Case (pageBeforeBack === "/") ──────────────────
      // User was already on Home with no overlays open. Show Exit Dialog.
      // Re-push sentinel to prevent immediate browser exit while dialog is open.
      window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
      setShowExitDialog(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [checkAndCloseOverlay]);

  // Dialog actions
  const handleCancel = useCallback(() => {
    setShowExitDialog(false);
  }, []);

  const handleExit = useCallback(() => {
    setShowExitDialog(false);
    // Platform-supported app exit
    if (window.Capacitor?.Plugins?.App?.exitApp) {
      window.Capacitor.Plugins.App.exitApp();
    } else if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
    } else {
      try {
        window.close();
      } catch (err) {
        console.log("Browser window close prevented", err);
      }
    }
  }, []);

  return {
    ExitDialog: (
      <ExitConfirmDialog
        isOpen={showExitDialog}
        onCancel={handleCancel}
        onExit={handleExit}
      />
    ),
  };
};
