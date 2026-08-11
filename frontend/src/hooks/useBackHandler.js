import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

/**
 * Intercepts the browser back button to behave like a native mobile app.
 *
 * How it works:
 * - Pushes a single "blocker" history entry above the current page.
 * - When back is pressed, popstate fires (we're still on the same URL).
 * - We inspect app state and decide what to do:
 *    1. Chat open? Close it.
 *    2. Inner page? Go home.
 *    3. At home, first press? Show "Press back again to exit" toast.
 *    4. At home, second press within 2s? Don't re-push — browser exits naturally.
 *
 * Key design decisions that make this reliable:
 * - Uses window.history.state to detect duplicate sentinels (safe in StrictMode).
 * - Uses window.location.pathname (not a stale ref) for the path check.
 * - Does NOT call window.close() — just lets the browser exit naturally on double-press.
 * - Reads Zustand state via .getState() so the listener never has a stale closure.
 */
const SENTINEL_KEY = "_backBlocker";

export const useBackHandler = () => {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  const exitPending = useRef(false);
  const exitTimer = useRef(null);

  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    // Push the blocker entry only if one isn't already there.
    // This is idempotent so React StrictMode's double-invoke is safe.
    if (!window.history.state?.[SENTINEL_KEY]) {
      window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
    }

    const handlePopState = () => {
      const { selectedUser, setSelectedUser } = useChatStore.getState();
      const { selectedGroup, setSelectedGroup } = useGroupStore.getState();
      const path = window.location.pathname;

      // --- Priority 1: close open chat ---
      if (selectedUser) {
        window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
        setSelectedUser(null);
        return;
      }

      // --- Priority 2: close open group ---
      if (selectedGroup) {
        window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
        setSelectedGroup(null);
        return;
      }

      // --- Priority 3: go home from inner page ---
      if (path !== "/") {
        window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
        navigateRef.current("/");
        return;
      }

      // --- Priority 4: at root ---
      if (exitPending.current) {
        // Second press within 2s — clear the toast and let the browser go back naturally.
        // We deliberately do NOT push a new blocker here.
        clearTimeout(exitTimer.current);
        exitPending.current = false;
        toast.dismiss("exit-toast");
        return;
      }

      // First press at root — show the toast and push a new blocker.
      window.history.pushState({ [SENTINEL_KEY]: true }, "", window.location.href);
      exitPending.current = true;

      toast("Press back again to exit", {
        id: "exit-toast",
        duration: 2000,
        icon: "👋",
        style: { borderRadius: "12px", fontWeight: "600", fontSize: "13px" },
      });

      exitTimer.current = setTimeout(() => {
        exitPending.current = false;
      }, 2000);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []); // Registers once. State is read via getState() and refs — no stale closures.
};
