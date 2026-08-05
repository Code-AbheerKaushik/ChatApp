import { useEffect, useState, useRef, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import {
  Users, Search, X, Pin, Archive, BellOff, Star,
  MailOpen, CheckCheck, MoreVertical, Trash2, Info
} from "lucide-react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "pinned", label: "Pinned" },
  { key: "favorites", label: "Favorites" },
  { key: "archived", label: "Archived" },
  { key: "muted", label: "Muted" },
  { key: "online", label: "Online" },
];

const getLastMessagePreview = (lastMessage) => {
  if (!lastMessage) return "No messages yet";
  if (lastMessage.fileType === "audio") return "🎤 Voice message";
  if (lastMessage.fileType === "video") return "🎥 Video";
  if (lastMessage.fileType === "document") return "📄 Document";
  if (lastMessage.fileType === "location") return "📍 Location";
  if (lastMessage.fileType === "sticker") return "😊 Sticker";
  if (lastMessage.image) return "📷 Photo";
  if (lastMessage.file) return "📎 Attachment";
  return lastMessage.text || "";
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (diff < 604800000) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── Overflow Menu ────────────────────────────────────────────────────────────
const OverflowMenu = ({ userId, isPinned, isMuted, isFavorite, isArchived, hasUnread, onClose, actions, anchorRef }) => {
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const menuItems = [
    {
      icon: <Pin className={`size-4 ${isPinned ? "text-primary" : ""}`} />,
      label: isPinned ? "Unpin Chat" : "Pin Chat",
      action: actions.togglePin,
    },
    {
      icon: <MailOpen className="size-4" />,
      label: hasUnread ? "Mark as Read" : "Mark as Unread",
      action: actions.toggleUnread,
    },
    {
      icon: <BellOff className={`size-4 ${isMuted ? "text-warning" : ""}`} />,
      label: isMuted ? "Unmute Notifications" : "Mute Notifications",
      action: actions.toggleMute,
    },
    {
      icon: <Star className={`size-4 ${isFavorite ? "text-yellow-500" : ""}`} fill={isFavorite ? "currentColor" : "none"} />,
      label: isFavorite ? "Remove from Favorites" : "Add to Favorites",
      action: actions.toggleFavorite,
    },
    {
      icon: <Archive className={`size-4 ${isArchived ? "text-info" : ""}`} />,
      label: isArchived ? "Unarchive Chat" : "Archive Chat",
      action: actions.toggleArchive,
    },
    { divider: true },
    {
      icon: <Info className="size-4 text-base-content/60" />,
      label: "View Contact Info",
      action: actions.viewInfo,
    },
    {
      icon: <Trash2 className="size-4 text-error" />,
      label: "Delete Chat",
      labelClass: "text-error",
      action: actions.deleteChat,
    },
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Chat options"
      className="absolute right-0 top-full mt-1 z-50 w-52 origin-top-right
        rounded-xl bg-base-100 border border-base-300
        shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        animate-[menuIn_0.12s_ease-out]
        overflow-hidden"
      style={{ minWidth: "13rem" }}
    >
      {menuItems.map((item, idx) => {
        if (item.divider) {
          return <div key={`div-${idx}`} className="my-1 h-px bg-base-300" />;
        }
        return (
          <button
            key={item.label}
            role="menuitem"
            onClick={() => { item.action?.(); onClose(); }}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm
              hover:bg-base-200 active:bg-base-300
              transition-colors duration-100 text-left focus:outline-none focus:bg-base-200
              ${item.labelClass || "text-base-content"}`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const {
    getUsers, users, selectedUser, setSelectedUser, isUsersLoading,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    pinnedUsers, archivedUsers, mutedUsers, favoriteUsers, unreadUsers,
    togglePinnedUser, toggleArchivedUser, toggleMutedUser, toggleFavoriteUser,
    markUnread, clearUnread,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuButtonRefs = useRef({});

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const isOnline = useCallback((userId) => onlineUsers.includes(String(userId)), [onlineUsers]);

  const filteredUsers = users.filter((user) => {
    const id = user._id;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = user.fullName?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    switch (activeFilter) {
      case "unread":    return unreadUsers.includes(id);
      case "pinned":    return pinnedUsers.includes(id);
      case "favorites": return favoriteUsers.includes(id);
      case "archived":  return archivedUsers.includes(id);
      case "muted":     return mutedUsers.includes(id);
      case "online":    return isOnline(id);
      default:          return !archivedUsers.includes(id);
    }
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aPinned = pinnedUsers.includes(a._id) ? 1 : 0;
    const bPinned = pinnedUsers.includes(b._id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    const aTime = a.lastMessage?.createdAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.createdAt;
    return new Date(bTime) - new Date(aTime);
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full md:w-20 lg:w-80 border-r border-base-300 flex flex-col bg-base-100 transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-base-300 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <span className="font-semibold text-base block md:hidden lg:block">Chats</span>
        </div>

        {/* Search Bar */}
        <div className="relative block md:hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="input input-bordered input-sm w-full pl-9 pr-8 rounded-xl text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide block md:hidden lg:flex">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`btn btn-xs rounded-full whitespace-nowrap flex-shrink-0 transition-all ${
                activeFilter === f.key ? "btn-primary" : "btn-ghost hover:bg-base-200"
              }`}
            >
              {f.label}
              {f.key === "unread" && unreadUsers.length > 0 && (
                <span className="badge badge-xs badge-error ml-0.5">{unreadUsers.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4 gap-2">
            <Users className="size-8 text-base-content/30" />
            <p className="text-sm text-base-content/50">
              {searchQuery ? "No contacts found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          sortedUsers.map((user) => {
            const userId = user._id;
            const isPinned  = pinnedUsers.includes(userId);
            const isMuted   = mutedUsers.includes(userId);
            const isFavorite= favoriteUsers.includes(userId);
            const isArchived= archivedUsers.includes(userId);
            const hasUnread = unreadUsers.includes(userId);
            const online    = isOnline(userId);
            const preview   = getLastMessagePreview(user.lastMessage);
            const timestamp = formatTime(user.lastMessage?.createdAt);
            const isMenuOpen = openMenuId === userId;
            const isSelected = selectedUser?._id === userId;

            const menuActions = {
              togglePin:     () => togglePinnedUser(userId),
              toggleMute:    () => toggleMutedUser(userId),
              toggleFavorite:() => toggleFavoriteUser(userId),
              toggleArchive: () => toggleArchivedUser(userId),
              toggleUnread:  () => hasUnread ? clearUnread(userId) : markUnread(userId),
              viewInfo:      () => setSelectedUser(user),
              deleteChat:    () => {
                // Archive acts as soft-delete; extend if needed
                toggleArchivedUser(userId);
                if (isSelected) setSelectedUser(null);
              },
            };

            return (
              <div key={userId} className="relative group">
                {/* Main chat row button */}
                <button
                  onClick={() => { setSelectedUser(user); setOpenMenuId(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left
                    transition-colors duration-100
                    hover:bg-base-200 active:bg-base-300
                    ${isSelected ? "bg-base-200" : ""}
                  `}
                  aria-label={`Open chat with ${user.fullName}`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-12 rounded-full object-cover"
                      loading="lazy"
                    />
                    {online && (
                      <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-base-100" />
                    )}
                  </div>

                  {/* Text info */}
                  <div className="flex-1 min-w-0 block md:hidden lg:block">
                    {/* Row 1: Name + indicators + timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`text-sm font-medium truncate leading-snug
                          ${hasUnread ? "text-base-content" : "text-base-content/90"}`}
                        >
                          {user.fullName}
                        </span>
                        {isFavorite && <Star className="size-3 text-yellow-500 flex-shrink-0" fill="currentColor" />}
                        {isPinned   && <Pin  className="size-3 text-base-content/40 flex-shrink-0" />}
                        {isMuted    && <BellOff className="size-3 text-base-content/30 flex-shrink-0" />}
                      </div>
                      {/* Timestamp — hidden when menu button is visible (group-hover on desktop) */}
                      <span className={`text-[11px] text-base-content/40 flex-shrink-0 transition-opacity
                        ${isMenuOpen ? "opacity-0" : "opacity-100"}
                        group-hover:opacity-0 group-hover:pointer-events-none`}
                      >
                        {timestamp}
                      </span>
                    </div>
                    {/* Row 2: Last message preview + unread dot */}
                    <div className="flex items-center justify-between mt-0.5 gap-2">
                      <p className={`text-xs truncate leading-snug
                        ${hasUnread ? "text-base-content/70 font-medium" : "text-base-content/45"}`}
                      >
                        {preview}
                      </p>
                      {hasUnread && (
                        <span className="size-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </button>

                {/* ⋮ Three-dot button */}
                {/* Desktop: show on row hover or when this menu is open
                    Mobile: always visible */}
                <div
                  className={`absolute right-2 top-1/2 -translate-y-1/2
                    block md:hidden lg:block
                    md:opacity-100
                    transition-opacity duration-100
                    lg:opacity-0 lg:group-hover:opacity-100
                    ${isMenuOpen ? "lg:opacity-100" : ""}
                  `}
                >
                  <button
                    ref={(el) => { menuButtonRefs.current[userId] = el; }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : userId);
                    }}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                    aria-label="More options"
                    className={`btn btn-ghost btn-xs btn-circle
                      transition-colors duration-100
                      ${isMenuOpen ? "bg-base-300 text-base-content" : "text-base-content/50 hover:text-base-content hover:bg-base-200"}`}
                  >
                    <MoreVertical className="size-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <OverflowMenu
                      userId={userId}
                      isPinned={isPinned}
                      isMuted={isMuted}
                      isFavorite={isFavorite}
                      isArchived={isArchived}
                      hasUnread={hasUnread}
                      onClose={() => setOpenMenuId(null)}
                      actions={menuActions}
                      anchorRef={{ current: menuButtonRefs.current[userId] }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Smooth open animation keyframe (injected once) */}
      <style>{`
        @keyframes menuIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
