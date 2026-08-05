import { useEffect, useState, useRef, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import {
  Users, Search, X, Pin, Archive, BellOff, Star,
  MailOpen, Trash2, CheckCheck, ChevronDown
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

const Sidebar = () => {
  const {
    getUsers, users, selectedUser, setSelectedUser, isUsersLoading,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    pinnedUsers, archivedUsers, mutedUsers, favoriteUsers, unreadUsers,
    togglePinnedUser, toggleArchivedUser, toggleMutedUser, toggleFavoriteUser, markUnread,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [quickActionUser, setQuickActionUser] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setQuickActionUser(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isOnline = useCallback((userId) => onlineUsers.includes(String(userId)), [onlineUsers]);

  const filteredUsers = users.filter((user) => {
    const id = user._id;
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = user.fullName?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Category filters
    switch (activeFilter) {
      case "unread": return unreadUsers.includes(id);
      case "pinned": return pinnedUsers.includes(id);
      case "favorites": return favoriteUsers.includes(id);
      case "archived": return archivedUsers.includes(id);
      case "muted": return mutedUsers.includes(id);
      case "online": return isOnline(id);
      default:
        return !archivedUsers.includes(id); // hide archived from "all"
    }
  });

  // Sort: pinned first, then by last message time
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aPinned = pinnedUsers.includes(a._id) ? 1 : 0;
    const bPinned = pinnedUsers.includes(b._id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    const aTime = a.lastMessage?.createdAt || a.createdAt;
    const bTime = b.lastMessage?.createdAt || b.createdAt;
    return new Date(bTime) - new Date(aTime);
  });

  const handleTouchStart = (userId) => {
    const timer = setTimeout(() => setQuickActionUser(userId), 600);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) clearTimeout(longPressTimer);
  };

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/40" />
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
                activeFilter === f.key
                  ? "btn-primary"
                  : "btn-ghost hover:bg-base-200"
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
            const isPinned = pinnedUsers.includes(userId);
            const isMuted = mutedUsers.includes(userId);
            const isFavorite = favoriteUsers.includes(userId);
            const isArchived = archivedUsers.includes(userId);
            const hasUnread = unreadUsers.includes(userId);
            const online = isOnline(userId);
            const preview = getLastMessagePreview(user.lastMessage);
            const timestamp = formatTime(user.lastMessage?.createdAt);

            return (
              <div
                key={userId}
                className="relative group"
                ref={quickActionUser === userId ? menuRef : null}
                onTouchStart={() => handleTouchStart(userId)}
                onTouchEnd={handleTouchEnd}
              >
                <button
                  onClick={() => {
                    setSelectedUser(user);
                    setQuickActionUser(null);
                  }}
                  className={`w-full p-3 flex items-center gap-3 hover:bg-base-200 transition-colors text-left
                    ${selectedUser?._id === userId ? "bg-base-200" : ""}
                  `}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-12 rounded-full object-cover"
                    />
                    {online && (
                      <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-base-100" />
                    )}
                  </div>

                  {/* User Info — shown on mobile and lg+ */}
                  <div className="flex-1 min-w-0 block md:hidden lg:block">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`font-medium truncate text-sm ${hasUnread ? "text-base-content" : "text-base-content/90"}`}>
                          {user.fullName}
                        </span>
                        {isFavorite && <Star className="size-3 text-yellow-500 flex-shrink-0" fill="currentColor" />}
                        {isPinned && <Pin className="size-3 text-base-content/50 flex-shrink-0" />}
                        {isMuted && <BellOff className="size-3 text-base-content/40 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {timestamp && <span className="text-xs text-base-content/40">{timestamp}</span>}
                        {hasUnread && (
                          <span className="size-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`text-xs truncate ${hasUnread ? "text-base-content/70 font-medium" : "text-base-content/50"}`}>
                        {preview}
                      </p>
                      {user.lastMessage?.senderId !== userId && user.lastMessage && (
                        <CheckCheck className="size-3 text-primary flex-shrink-0 ml-1" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Desktop Hover Quick Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex md:hidden lg:flex items-center gap-0.5 bg-base-100 shadow-md rounded-xl p-1 border border-base-300 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePinnedUser(userId); }}
                    className="btn btn-ghost btn-xs btn-circle tooltip tooltip-top"
                    data-tip={isPinned ? "Unpin" : "Pin"}
                    title={isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className={`size-3.5 ${isPinned ? "text-primary" : ""}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMutedUser(userId); }}
                    className="btn btn-ghost btn-xs btn-circle"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    <BellOff className={`size-3.5 ${isMuted ? "text-warning" : ""}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavoriteUser(userId); }}
                    className="btn btn-ghost btn-xs btn-circle"
                    title={isFavorite ? "Unfavorite" : "Favorite"}
                  >
                    <Star className={`size-3.5 ${isFavorite ? "text-yellow-500" : ""}`} fill={isFavorite ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleArchivedUser(userId); }}
                    className="btn btn-ghost btn-xs btn-circle"
                    title={isArchived ? "Unarchive" : "Archive"}
                  >
                    <Archive className={`size-3.5 ${isArchived ? "text-info" : ""}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); markUnread(userId); }}
                    className="btn btn-ghost btn-xs btn-circle"
                    title="Mark Unread"
                  >
                    <MailOpen className="size-3.5" />
                  </button>
                </div>

                {/* Mobile Long-press Quick Action Sheet */}
                {quickActionUser === userId && (
                  <div
                    ref={menuRef}
                    className="absolute left-0 right-0 z-20 bg-base-100 border-t border-base-300 shadow-lg p-2 flex flex-wrap gap-2 md:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { label: isPinned ? "Unpin" : "Pin", icon: <Pin className="size-4" />, action: () => togglePinnedUser(userId) },
                      { label: isMuted ? "Unmute" : "Mute", icon: <BellOff className="size-4" />, action: () => toggleMutedUser(userId) },
                      { label: isFavorite ? "Unfavorite" : "Favorite", icon: <Star className="size-4" />, action: () => toggleFavoriteUser(userId) },
                      { label: isArchived ? "Unarchive" : "Archive", icon: <Archive className="size-4" />, action: () => toggleArchivedUser(userId) },
                      { label: "Mark Unread", icon: <MailOpen className="size-4" />, action: () => markUnread(userId) },
                    ].map((a) => (
                      <button
                        key={a.label}
                        className="btn btn-sm btn-ghost gap-1 flex-1"
                        onClick={() => { a.action(); setQuickActionUser(null); }}
                      >
                        {a.icon} {a.label}
                      </button>
                    ))}
                    <button className="btn btn-sm btn-ghost w-full" onClick={() => setQuickActionUser(null)}>
                      <X className="size-4" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
