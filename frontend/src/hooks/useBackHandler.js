import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

/**
 * Handles the browser/device back button like a native mobile app.
 *
 * Priority order when back is pressed:
 * 1. If a chat or group is open on mobile → close it
 * 2. If on a non-home page → navigate to "/"
 * 3. If at "/" → show "Press back again to exit" toast; second press exits
 *
 * Uses refs to read current state so the effect only registers once on mount.
 * This avoids the re-run/cleanup cycle that was causing phantom back navigations.
 */
const ROOT_PATH = "/";

export const useBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Refs so the single popstate handler always reads fresh values
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);
  const backPressedOnce = useRef(false);
  const toastId = useRef(null);

  // Keep refs in sync without re-registering the event listener
  useEffect(() => { locationRef.current = location; }, [location]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    // Push ONE sentinel entry so the first back press fires popstate
    // instead of immediately leaving the app.
    window.history.pushState({ _appSentinel: true }, "");

    const handlePopState = () => {
      // Always re-push the sentinel so the NEXT back press is also intercepted.
      window.history.pushState({ _appSentinel: true }, "");

      // Read latest state directly from stores (avoids stale closure)
      const { selectedUser, setSelectedUser } = useChatStore.getState();
      const { selectedGroup, setSelectedGroup } = useGroupStore.getState();
      const isAtRoot = locationRef.current.pathname === ROOT_PATH;

      // --- Priority 1: close open chat / group (mobile slide panel) ---
      if (selectedUser) {
        setSelectedUser(null);
        return;
      }
      if (selectedGroup) {
        setSelectedGroup(null);
        return;
      }

      // --- Priority 2: go home from inner page ---
      if (!isAtRoot) {
        navigateRef.current(ROOT_PATH);
        return;
      }

      // --- Priority 3: double-back to exit at root ---
      if (backPressedOnce.current) {
        if (toastId.current) toast.dismiss(toastId.current);
        window.close(); // Works for PWA/standalone; browsers silently ignore for regular tabs
        return;
      }

      backPressedOnce.current = true;
      toastId.current = toast("Press back again to exit", {
        duration: 2000,
        icon: "👋",
        style: { borderRadius: "12px", fontWeight: "600", fontSize: "13px" },
      });

      setTimeout(() => {
        backPressedOnce.current = false;
        toastId.current = null;
      }, 2000);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Remove the sentinel we pushed (no history.back() — that would trigger popstate)
      window.history.replaceState(null, "");
    };
  }, []); // Empty deps — registers once, reads state via refs and store.getState()
};
