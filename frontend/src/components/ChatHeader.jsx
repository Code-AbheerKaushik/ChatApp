import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Phone, Video, Search, MoreVertical, X, BellOff, Star, Archive, Trash2, Pin } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers, conversationSearchQuery, setConversationSearch, toggleConversationSearch, conversationSearchOpen } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [callModal, setCallModal] = useState(null); // "voice" | "video" | null
  const menuRef = useRef(null);

  const isOnline = onlineUsers.includes(String(selectedUser?._id));
  const isTyping = typingUsers[selectedUser?._id];

  const statusText = isTyping
    ? "typing..."
    : isOnline
    ? "Online"
    : "Offline";

  // Close menu on click outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-base-300 bg-base-100 gap-2 min-h-[3.75rem] safe-top flex-shrink-0">
        {/* Left: Back + Avatar + Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile back button */}
          <button
            onClick={() => setSelectedUser(null)}
            className="md:hidden btn btn-ghost btn-sm btn-circle flex-shrink-0"
            aria-label="Back to contacts"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={selectedUser?.profilePic || "/avatar.png"}
              alt={selectedUser?.fullName}
              className="size-9 sm:size-10 rounded-full object-cover"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 size-2.5 bg-success rounded-full ring-2 ring-base-100" />
            )}
          </div>

          {/* Name + Status */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate leading-snug">{selectedUser?.fullName}</h3>
            <p className={`text-xs truncate leading-none transition-colors ${isTyping ? "text-primary font-medium animate-pulse" : isOnline ? "text-success" : "text-base-content/50"}`}>
              {statusText}
            </p>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          {/* Desktop Search toggle */}
          <button
            onClick={toggleConversationSearch}
            className={`btn btn-ghost btn-sm btn-circle hidden sm:flex ${conversationSearchOpen ? "btn-active" : ""}`}
            title="Search in conversation"
          >
            <Search className="size-4" />
          </button>

          {/* Voice Call - Desktop */}
          <button
            onClick={() => setCallModal("voice")}
            className="btn btn-ghost btn-sm btn-circle hidden sm:flex"
            title="Voice call"
          >
            <Phone className="size-4" />
          </button>

          {/* Video Call - Desktop */}
          <button
            onClick={() => setCallModal("video")}
            className="btn btn-ghost btn-sm btn-circle hidden sm:flex"
            title="Video call"
          >
            <Video className="size-4" />
          </button>

          {/* More Options Dropdown (Overflow Menu) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="btn btn-ghost btn-sm btn-circle"
              title="More options"
              aria-label="More options"
            >
              <MoreVertical className="size-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-base-100 shadow-xl border border-base-300 rounded-xl w-48 z-50 overflow-hidden py-1">
                {[
                  { icon: <Search className="size-4" />, label: "Search Chat", action: () => { toggleConversationSearch(); setMenuOpen(false); } },
                  { icon: <Phone className="size-4" />, label: "Voice Call", action: () => { setCallModal("voice"); setMenuOpen(false); } },
                  { icon: <Video className="size-4" />, label: "Video Call", action: () => { setCallModal("video"); setMenuOpen(false); } },
                  { icon: <BellOff className="size-4" />, label: "Mute Notifications", action: () => setMenuOpen(false) },
                  { icon: <X className="size-4 text-error" />, label: "Close Chat", action: () => { setSelectedUser(null); setMenuOpen(false); } },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-base-200 transition-colors text-left"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop close */}
          <button
            onClick={() => setSelectedUser(null)}
            className="hidden md:flex btn btn-ghost btn-sm btn-circle"
            title="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Conversation Search Bar */}
      {conversationSearchOpen && (
        <div className="px-3 py-2 border-b border-base-300 bg-base-100 flex items-center gap-2 flex-shrink-0">
          <Search className="size-4 text-base-content/40 flex-shrink-0" />
          <input
            type="text"
            value={conversationSearchQuery}
            onChange={(e) => setConversationSearch(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
          {conversationSearchQuery && (
            <button onClick={() => setConversationSearch("")} className="btn btn-ghost btn-xs btn-circle">
              <X className="size-3" />
            </button>
          )}
          <button onClick={toggleConversationSearch} className="btn btn-ghost btn-xs btn-circle">
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Call Modal (Simulated) */}
      {callModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-base-100 rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl w-72">
            <img
              src={selectedUser?.profilePic || "/avatar.png"}
              alt={selectedUser?.fullName}
              className="size-24 rounded-full object-cover ring-4 ring-primary/30 animate-pulse"
            />
            <div className="text-center">
              <h3 className="font-bold text-lg">{selectedUser?.fullName}</h3>
              <p className="text-sm text-base-content/60 mt-1">
                {callModal === "voice" ? "📞 Voice Calling..." : "📹 Video Calling..."}
              </p>
            </div>
            <button
              onClick={() => setCallModal(null)}
              className="btn btn-error btn-circle btn-lg"
              title="End Call"
            >
              <Phone className="size-6 rotate-[135deg]" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatHeader;
