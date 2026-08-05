import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

// Calculate position synchronously on initial mount to eliminate frame 0 jumping
const calculateInitialPosition = (triggerRect) => {
  if (!triggerRect || typeof window === "undefined") {
    return { top: 0, left: 0, isUpward: false };
  }
  const menuWidth = 208; // w-52 (208px)
  const menuHeight = 270;
  const padding = 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceBelow = viewportHeight - triggerRect.bottom;
  const isUpward = spaceBelow < menuHeight + padding && triggerRect.top > menuHeight;

  let top = isUpward ? triggerRect.top - menuHeight - 4 : triggerRect.bottom + 4;
  top = Math.max(padding, Math.min(top, viewportHeight - menuHeight - padding));

  let left = triggerRect.right - menuWidth;
  if (left < padding) left = triggerRect.left;
  if (left + menuWidth > viewportWidth - padding) left = viewportWidth - menuWidth - padding;

  return { top, left, isUpward };
};

/**
 * ContextMenuPortal
 * Production-quality floating context menu & mobile bottom sheet component.
 * Rendered into document.body via React Portal.
 */
const ContextMenuPortal = ({
  triggerRect,
  menuItems = [],
  onClose,
  title = "Chat Options",
}) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(() => calculateInitialPosition(triggerRect));
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 640 : false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Filter out dividers for keyboard index calculation
  const actionItems = menuItems.filter((item) => !item.divider);

  // 1. Detect Screen Resize & Mobile Viewport
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (mobile) return;
      onClose(); // Close menu on window resize for stability
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onClose]);

  // 2. Refine position using actual DOM rect before browser repaint
  useLayoutEffect(() => {
    if (isMobile || !triggerRect || !menuRef.current) return;

    const menuEl = menuRef.current;
    const menuWidth = menuEl.offsetWidth || 208;
    const menuHeight = menuEl.offsetHeight || 270;
    const padding = 8;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - triggerRect.bottom;
    const isUpward = spaceBelow < menuHeight + padding && triggerRect.top > menuHeight;

    let top = isUpward ? triggerRect.top - menuHeight - 4 : triggerRect.bottom + 4;
    top = Math.max(padding, Math.min(top, viewportHeight - menuHeight - padding));

    let left = triggerRect.right - menuWidth;
    if (left < padding) left = triggerRect.left;
    if (left + menuWidth > viewportWidth - padding) left = viewportWidth - menuWidth - padding;

    setPosition({ top, left, isUpward });
  }, [triggerRect, isMobile]);

  // 3. Scroll Capture Listener: Close menu instantly on scroll
  useEffect(() => {
    const handleScroll = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      onClose();
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [onClose]);

  // 4. Pointerdown Outside Listener
  useEffect(() => {
    const handlePointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

  // 5. Keyboard Navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % actionItems.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + actionItems.length) % actionItems.length);
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < actionItems.length) {
          const item = actionItems[focusedIndex];
          item.action?.();
          onClose();
        }
      }
    },
    [actionItems, focusedIndex, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus menu container on mount
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  if (typeof document === "undefined") return null;

  // ─── MOBILE BOTTOM SHEET VIEW ─────────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="flex-1 w-full" onClick={onClose} aria-hidden="true" />
        <div
          ref={menuRef}
          tabIndex={-1}
          role="menu"
          aria-label={title}
          className="w-full bg-base-100 border-t border-base-300 rounded-t-3xl shadow-2xl p-4 space-y-2 animate-in slide-in-from-bottom duration-200 safe-bottom"
        >
          <div className="w-12 h-1.5 bg-base-300 rounded-full mx-auto mb-2 opacity-80" />
          <div className="px-3 py-1 mb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-base-content/50">{title}</p>
          </div>
          <div className="space-y-1">
            {menuItems.map((item, idx) => {
              if (item.divider) {
                return <div key={`div-${idx}`} className="my-1.5 h-px bg-base-200" />;
              }
              const isFocused = actionItems.findIndex((a) => a.label === item.label) === focusedIndex;

              return (
                <button
                  key={item.label}
                  role="menuitem"
                  onClick={() => {
                    item.action?.();
                    onClose();
                  }}
                  className={`flex items-center gap-3.5 w-full px-4 py-3 text-sm font-medium rounded-xl transition-colors text-left active:scale-[0.98] ${
                    isFocused ? "bg-base-200" : "hover:bg-base-200/60"
                  } ${item.labelClass || "text-base-content"}`}
                >
                  <span className="flex-shrink-0 text-base">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 mt-2 text-sm font-semibold text-base-content/70 bg-base-200/70 hover:bg-base-200 rounded-xl transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // ─── DESKTOP / TABLET INSTANT POP-IN FLOATING MENU ────────────────────────
  let actionIdxCounter = 0;

  return createPortal(
    <>
      <div
        ref={menuRef}
        tabIndex={-1}
        role="menu"
        aria-label={title}
        className="fixed z-[9999] w-52 rounded-xl bg-base-100/95 backdrop-blur-md border border-base-300 shadow-[0_8px_30px_rgba(0,0,0,0.18)] outline-none overflow-hidden animate-[popIn_0.07s_ease-out]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          minWidth: "13rem",
          transformOrigin: position.isUpward ? "bottom right" : "top right",
        }}
      >
        <div className="py-1.5">
          {menuItems.map((item, idx) => {
            if (item.divider) {
              return <div key={`div-${idx}`} className="my-1 h-px bg-base-300/80" />;
            }

            const currentActionIdx = actionIdxCounter++;
            const isFocused = currentActionIdx === focusedIndex;

            return (
              <button
                key={item.label}
                role="menuitem"
                onMouseEnter={() => setFocusedIndex(currentActionIdx)}
                onClick={(e) => {
                  e.stopPropagation();
                  item.action?.();
                  onClose();
                }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors duration-100 text-left focus:outline-none ${
                  isFocused ? "bg-base-200 text-base-content font-medium" : "hover:bg-base-200/80 text-base-content/90"
                } ${item.labelClass || ""}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>,
    document.body
  );
};

export default ContextMenuPortal;
