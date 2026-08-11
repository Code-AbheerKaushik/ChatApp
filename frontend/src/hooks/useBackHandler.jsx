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
// Centralized source of truth for Back-button navigation.
//
// Rules:
// 1. If an active input / keyboard is focused → blur input.
// 2. If a modal / popup / mobile chat view is open → close overlay.
// 3. If user was on an INNER PAGE (e.g. /profile, /settings) and pressed Back →
//    Return to previous page (Home). DO NOT show exit dialog.
// 4. If user was ALREADY ON HOME ("/") and pressed Back →
//    Show Exit Confirmation Dialog.
// ─────────────────────────────────────────────────────────────────────────────

const HOME_PATH = "/";

export const useBackHandler = () => {
  const location = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Ref tracking the settled route pathname BEFORE the popstate event occurs
  const lastSettledPathRef = useRef(location.pathname);

  // Keep lastSettledPathRef updated as user navigates through the app
  useEffect(() => {
    lastSettledPathRef.current = location.pathname;
  }, [location.pathname]);

  // Helper: Check and close active keyboard or UI overlays (modals, lightboxes, mobile chats)
  const checkAndCloseOverlay = useCallback(() => {
    // 1. Active text input / keyboard focus
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

    // 3. Open DOM Modals / Lightboxes (fixed inset-0 elements excluding exit dialog)
    const openOverlay = document.querySelector(
      ".fixed.inset-0:not(#exit-confirm-dialog-overlay)"
    );
    if (openOverlay) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
      return true;
    }

    return false;
  }, []);

  // Main Back event listener
  useEffect(() => {
    const handlePopState = () => {
      const pathBeforePop = lastSettledPathRef.current;

      // ── Step 1: Handle active keyboard or open UI overlays ──────────────
      const overlayWasClosed = checkAndCloseOverlay();
      if (overlayWasClosed) {
        // Restore history entry for current path so location doesn't change
        window.history.pushState(null, "", window.location.href);
        return;
      }

      // ── Step 2: Inner page back navigation ───────────────────────────────
      // If user was on an inner page (/profile, /settings, etc.) when Back was pressed,
      // allow natural React Router back navigation. DO NOT show exit prompt.
      if (pathBeforePop !== HOME_PATH) {
        return;
      }

      // ── Step 3: Home page back navigation ────────────────────────────────
      // User was ALREADY sitting on Home ("/") with no overlays active when Back was pressed.
      // Hold position on Home and show Exit Confirmation Dialog.
      window.history.pushState(null, "", window.location.href);
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
