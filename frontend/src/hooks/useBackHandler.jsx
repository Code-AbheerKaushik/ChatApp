import { useEffect, useRef, useState, useCallback } from "react";
import { useBlocker, useLocation } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

// ---------------------------------------------------------------------------
// ExitConfirmDialog
// A mobile-friendly dialog that appears when the user tries to leave the app
// from the home page. Matches the existing app design system (daisyUI tokens).
// ---------------------------------------------------------------------------
const ExitConfirmDialog = ({ isOpen, onCancel, onExit }) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}   // tap backdrop = cancel
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
    >
      <div
        className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="p-4 rounded-full bg-error/10 mb-4">
            <LogOut className="size-7 text-error" />
          </div>
          <h2
            id="exit-dialog-title"
            className="text-base font-bold text-base-content mb-1 text-center"
          >
            Exit App?
          </h2>
          <p className="text-sm text-base-content/60 text-center leading-snug">
            Are you sure you want to leave?
          </p>
        </div>

        {/* Actions */}
        <div className="flex border-t border-base-300">
          <button
            id="exit-dialog-cancel"
            onClick={onCancel}
            className="flex-1 py-4 text-sm font-semibold text-base-content/70 hover:bg-base-200 transition-colors border-r border-base-300"
          >
            Cancel
          </button>
          <button
            id="exit-dialog-exit"
            onClick={onExit}
            className="flex-1 py-4 text-sm font-bold text-error hover:bg-error/5 transition-colors"
            autoFocus
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// useBackHandler
//
// Single source of truth for back-button behavior across the entire app.
//
// How it works:
// 1. Inner pages (profile, settings, etc.) → back navigates to "/" via React
//    Router. useBlocker only activates when leaving "/" outward to external
//    history (i.e. leaving the app), so inner-page back is never blocked.
//
// 2. At "/" with a chat open → popstate handler closes the chat panel.
//    We intercept this BEFORE useBlocker sees it.
//
// 3. At "/" with no chat open and an outward navigation attempt →
//    useBlocker fires → ExitConfirmDialog appears.
//    Cancel → blocker.reset() → stay on "/".
//    Exit → blocker.proceed() → browser exits naturally.
//
// Key properties:
// - NO arbitrary timeouts.
// - NO window.close().
// - NO sentinel pushState hacks.
// - ONE listener (popstate for chat-panel close, useBlocker for exit).
// - No duplicate dialogs (useBlocker is idempotent per navigation attempt).
// ---------------------------------------------------------------------------
export const useBackHandler = () => {
  const location = useLocation();
  const isAtRoot = location.pathname === "/";

  // ── 1. Close open chat / group on back (mobile panel) ───────────────────
  // This is a raw popstate listener that fires BEFORE React Router processes
  // the navigation, so we can intercept and re-push state to cancel the move.
  const sentinelPushed = useRef(false);

  useEffect(() => {
    // Push ONE sentinel so the back button fires popstate instead of
    // immediately leaving React Router's jurisdiction.
    // Guard with a ref so StrictMode double-invocation doesn't push twice.
    if (!sentinelPushed.current) {
      sentinelPushed.current = true;
      window.history.pushState({ _chatPanelBlocker: true }, "", window.location.href);
    }

    const handlePopState = () => {
      const { selectedUser, setSelectedUser } = useChatStore.getState();
      const { selectedGroup, setSelectedGroup } = useGroupStore.getState();

      if (selectedUser || selectedGroup) {
        // Re-push the sentinel so future back presses are also intercepted.
        window.history.pushState({ _chatPanelBlocker: true }, "", window.location.href);
        setSelectedUser(null);
        setSelectedGroup(null);
        return;
      }
      // For all other cases (inner page → home, home → exit), React Router's
      // useBlocker handles it. We do NOT push a sentinel here so React Router
      // receives the navigation normally.
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []); // Registers once. Reads store state via .getState() — no stale closures.

  // ── 2. Block app-exit when at root ──────────────────────────────────────
  // useBlocker fires when React Router detects a navigation that would leave
  // the current route. At "/", this means the user has exhausted in-app history
  // and is trying to exit the SPA entirely.
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation, historyAction }) => {
        // Only block when:
        //   a) currently at root "/"
        //   b) the action is POP (back button), not PUSH/REPLACE (in-app nav)
        //   c) going to a different path (or same path via history pop)
        return (
          isAtRoot &&
          historyAction === "POP" &&
          currentLocation.pathname === "/"
        );
      },
      [isAtRoot]
    )
  );

  const handleCancel = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  const handleExit = useCallback(() => {
    if (blocker.state === "blocked") blocker.proceed();
  }, [blocker]);

  return {
    ExitDialog: (
      <ExitConfirmDialog
        isOpen={blocker.state === "blocked"}
        onCancel={handleCancel}
        onExit={handleExit}
      />
    ),
  };
};
