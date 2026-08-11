import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

// ─── Exit Confirmation Dialog ─────────────────────────────────────────────────
// Matches the app's design system (daisyUI base tokens). Mobile-friendly,
// accessible, prevents interaction with the page behind it.
const ExitConfirmDialog = ({ isOpen, onCancel, onExit }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dlg-title"
    >
      <div
        className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden"
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
            Are you sure you want to leave?
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
//
// Works with <BrowserRouter> (no data-router required).
//
// State machine:
//
//   IDLE  ──back at root, hasNavigatedAway=false──▶  BLOCKING
//   IDLE  ──back at root, hasNavigatedAway=true ──▶  (transparent, stay home)
//   BLOCKING ──Cancel──▶  IDLE
//   BLOCKING ──Exit  ──▶  browser exits naturally
//
// How it works step by step:
//   1. On mount, push ONE sentinel entry so back-press fires popstate instead
//      of immediately leaving the browser session.
//   2. popstate handler:
//      a. Chat/group open → close panel, re-push sentinel.
//      b. On inner page → re-push sentinel (React Router will navigate to /).
//      c. At root, user navigated away before → "return to home" — transparent.
//      d. At root, user was here all along → push sentinel, show exit dialog.
//   3. Exit clicked → set skip flag, go(-1) to pop the latest sentinel,
//      popstate fires → skip flag → no new sentinel → browser exits.
//   4. Cancel clicked → just close dialog, existing sentinel stays.
//
// ONE popstate listener. No duplicate dialogs. No arbitrary timeouts.
// No window.close(). No useBlocker (which requires a data router).
// ─────────────────────────────────────────────────────────────────────────────

const SENTINEL_KEY = "_appBackBlocker";

export const useBackHandler = () => {
  const location = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);

  // True if the user has navigated to any inner page (/profile, /settings, etc.)
  // since arriving at root. Used to distinguish "back from inner page" vs "exit".
  const hasNavigatedAway = useRef(false);

  // When true, the next popstate event should NOT push a new sentinel (exit flow).
  const skipNextIntercept = useRef(false);

  // Guards against StrictMode double-invoke pushing sentinel twice.
  const sentinelPushed = useRef(false);

  // Track inner-page navigation via location changes
  useEffect(() => {
    if (location.pathname !== "/") {
      hasNavigatedAway.current = true;
    }
  }, [location.pathname]);

  // Main back-button interception — registered once on mount
  useEffect(() => {
    if (!sentinelPushed.current) {
      sentinelPushed.current = true;
      window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
    }

    const handlePopState = () => {
      // ── Exit flow: let the browser navigate away naturally ─────────────
      if (skipNextIntercept.current) {
        skipNextIntercept.current = false;
        return;
      }

      const { selectedUser, setSelectedUser } = useChatStore.getState();
      const { selectedGroup, setSelectedGroup } = useGroupStore.getState();
      const path = window.location.pathname;

      // ── Priority 1: close mobile chat/group slide-in panel ─────────────
      if (selectedUser || selectedGroup) {
        window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
        setSelectedUser(null);
        setSelectedGroup(null);
        return;
      }

      // ── Priority 2: inner page — React Router will render the route ─────
      // Re-push sentinel so future back presses are still intercepted.
      if (path !== "/") {
        window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
        return;
      }

      // ── At root "/" ─────────────────────────────────────────────────────
      if (hasNavigatedAway.current) {
        // User came back from an inner page — transparent return to home.
        hasNavigatedAway.current = false;
        window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
        return;
      }

      // User was already at root with no inner-page history — show exit dialog.
      // Push sentinel to hold position while dialog is open.
      window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
      setShowExitDialog(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // Empty deps — reads store and refs, no stale closures

  const handleCancel = useCallback(() => {
    // Sentinel is already in history from when we showed the dialog.
    // Just close dialog; user stays at home.
    setShowExitDialog(false);
  }, []);

  const handleExit = useCallback(() => {
    setShowExitDialog(false);
    // Tell the handler to skip the next popstate (don't push a new sentinel).
    skipNextIntercept.current = true;
    // Pop the sentinel we pushed when showing the dialog.
    // popstate will fire → skipNextIntercept=true → handler returns early →
    // browser is now one step back (the pre-dialog history entry) and will
    // exit the app on the next natural back press / navigation.
    window.history.go(-1);
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
