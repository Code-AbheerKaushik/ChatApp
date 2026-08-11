import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

/**
 * Handles the browser/device back button in a SPA the way mobile apps do.
 *
 * Priority order when back is pressed:
 * 1. If a chat or group is open on mobile → close it (return to sidebar)
 * 2. If on a non-home page (settings, profile, etc.) → navigate to "/"
 * 3. If already at "/" → show "Press back again to exit" toast
 *    Second press within 2 seconds → attempt window.close()
 */
const ROOT_PATH = "/";

export const useBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backPressedOnce = useRef(false);
  const toastId = useRef(null);

  const { selectedUser, setSelectedUser } = useChatStore();
  const { selectedGroup, setSelectedGroup } = useGroupStore();

  useEffect(() => {
    // Push a sentinel history entry so the first back press fires popstate
    // instead of leaving the app.
    window.history.pushState({ _appSentinel: true }, "");

    const handlePopState = () => {
      // Always re-push the sentinel to catch the next back press too.
      window.history.pushState({ _appSentinel: true }, "");

      const isAtRoot = location.pathname === ROOT_PATH;

      // --- Priority 1: Close open chat/group (mobile slide-in panel) ---
      if (selectedUser) {
        setSelectedUser(null);
        return;
      }
      if (selectedGroup) {
        setSelectedGroup(null);
        return;
      }

      // --- Priority 2: Navigate back to home from inner pages ---
      if (!isAtRoot) {
        navigate(ROOT_PATH);
        return;
      }

      // --- Priority 3: Already at root → "double back to exit" pattern ---
      if (backPressedOnce.current) {
        if (toastId.current) toast.dismiss(toastId.current);
        // Attempt to close the tab/PWA window
        window.close();
        // window.close() only works if the page was opened by a script.
        // For PWA standalone mode it usually works. For regular browser tabs
        // the browser will ignore it — which is fine, the user stays in the app.
        return;
      }

      backPressedOnce.current = true;
      toastId.current = toast("Press back again to exit", {
        duration: 2000,
        icon: "👋",
        style: {
          borderRadius: "12px",
          fontWeight: "600",
          fontSize: "13px",
        },
      });

      const timer = setTimeout(() => {
        backPressedOnce.current = false;
        toastId.current = null;
      }, 2000);

      return () => clearTimeout(timer);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Remove the sentinel we pushed when this hook unmounts
      window.history.back();
    };
  }, [location.pathname, selectedUser, selectedGroup, navigate, setSelectedUser, setSelectedGroup]);
};
