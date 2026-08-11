import { useEffect, useState, useRef, useCallback, memo } from "react";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import ContextMenuPortal from "./ContextMenuPortal";
import {
  Users, Search, X, Pin, Archive, BellOff, Star,
  MailOpen, MoreVertical, Trash2, User, MessageSquare
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

// ─── Memoized Sidebar Contact Item ───────────────────────────────────────────
const SidebarItem = memo(({
  user,
  isSelected,
  isMenuOpen,
  isOnline,
  isPinned,
  isMuted,
  isFavorite,
  unreadCount,
  onSelect,
  onOpenMenu,
}) => {
  const triggerRef = useRef(null);
  const hasUnread = unreadCount > 0;
  const preview = getLastMessagePreview(user.lastMessage);
  const timestamp = formatTime(user.lastMessage?.createdAt);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    onOpenMenu(user, rect);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Use click position bounding rect for context menu on right click
    const rect = {
      top: e.clientY,
      bottom: e.clientY,
      left: e.clientX,
      right: e.clientX,
      width: 0,
      height: 0,
    };
    onOpenMenu(user, rect);
  };

  return (
    <div
      className={`relative group ${isMenuOpen ? "z-10" : ""}`}
      onContextMenu={handleContextMenu}
    >
      {/* Main Chat Row */}
      <button
        onClick={onSelect}
        className={`w-full flex items-center gap-3 px-3 py-3 text-left
          transition-colors duration-150
          hover:bg-base-200/80 active:bg-base-300
          ${isSelected || isMenuOpen ? "bg-base-200 font-medium" : ""}
        `}
        aria-label={`Open chat with ${user.fullName}`}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={user.profilePic || "/avatar.png"}
            alt={user.fullName}
            className="size-12 rounded-full object-cover shadow-xs"
            loading="lazy"
          />
          {isOnline && (
            <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-base-100 animate-pulse" />
          )}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0 block md:hidden lg:block">
          {/* Row 1: Name + Indicators + Timestamp */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0">
              <span className={`text-sm truncate leading-snug ${hasUnread ? "font-bold text-base-content" : "font-medium text-base-content/90"}`}>
                {user.fullName}
              </span>
              {isFavorite && <Star className="size-3 text-yellow-500 flex-shrink-0" fill="currentColor" />}
              {isPinned && <Pin className="size-3 text-primary flex-shrink-0" />}
              {isMuted && <BellOff className="size-3 text-base-content/40 flex-shrink-0" />}
            </div>

            <span className={`text-[11px] text-base-content/40 flex-shrink-0 transition-opacity ${isMenuOpen ? "opacity-0" : "group-hover:opacity-0"}`}>
              {timestamp}
            </span>
          </div>

          {/* Row 2: Last Message Preview + Unread Badge */}
          <div className="flex items-center justify-between mt-0.5 gap-2">
            <p className={`text-xs truncate leading-snug ${hasUnread ? "text-base-content/80 font-semibold" : "text-base-content/50"}`}>
              {preview}
            </p>
            {hasUnread && (
              <span className="bg-primary text-primary-content text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] h-5 flex items-center justify-center flex-shrink-0 animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* ⋮ Three-Dot Button */}
      <div className={`absolute right-2 top-1/2 -translate-y-1/2 block md:hidden lg:block transition-opacity duration-150 ${isMenuOpen ? "opacity-100 z-20" : "opacity-0 group-hover:opacity-100"}`}>
        <button
          ref={triggerRef}
          onClick={handleMenuClick}
          aria-label={`Options for ${user.fullName}`}
          className={`btn btn-ghost btn-xs btn-circle transition-colors duration-100 ${
            isMenuOpen ? "bg-primary text-primary-content shadow-xs" : "text-base-content/60 hover:text-base-content hover:bg-base-200"
          }`}
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
    </div>
  );
});

SidebarItem.displayName = "SidebarItem";

// ─── Main Sidebar Component ──────────────────────────────────────────────────
const Sidebar = () => {
  const {
    getUsers, users, selectedUser, setSelectedUser, isUsersLoading,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    pinnedUsers, archivedUsers, mutedUsers, favoriteUsers, unreadUsers, unreadCounts,
    togglePinnedUser, toggleArchivedUser, toggleMutedUser, toggleFavoriteUser,
    markUnread, clearUnread,
    searchMessages, globalSearchResults, globalSearchHasMore, globalSearchLoading, openMessageResult, savedMessagesVersion,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const navigate = useNavigate();

  // Active Context Menu State (Single active menu across the app)
  const [activeMenu, setActiveMenu] = useState(null); // { user, triggerRect } | null
  const [savedMessages, setSavedMessages] = useState([]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    const timer = setTimeout(() => searchMessages(query), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchMessages]);

  useEffect(() => {
    if (activeFilter !== "saved") return;
    axiosInstance.get("/messages/starred").then((res) => setSavedMessages(res.data.results)).catch(() => setSavedMessages([]));
  }, [activeFilter, savedMessagesVersion]);

  const isOnline = useCallback((userId) => onlineUsers.includes(String(userId)), [onlineUsers]);

  const handleOpenMenu = useCallback((user, triggerRect) => {
    setActiveMenu((prev) => (prev?.user?._id === user._id ? null : { user, triggerRect }));
  }, []);

  const handleCloseMenu = useCallback(() => {
    setActiveMenu(null);
  }, []);

  const filteredUsers = users.filter((user) => {
    const id = user._id;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = user.fullName?.toLowerCase().includes(q) || user.email?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    switch (activeFilter) {
      case "unread": return unreadUsers.includes(id);
      case "pinned": return pinnedUsers.includes(id);
      case "favorites": return favoriteUsers.includes(id);
      case "archived": return archivedUsers.includes(id);
      case "muted": return mutedUsers.includes(id);
      case "online": return isOnline(id);
      default: return !archivedUsers.includes(id);
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

  // Prepare context menu items for the currently active user
  const getMenuItemsForUser = (user) => {
    if (!user) return [];
    const userId = user._id;
    const isPinned = pinnedUsers.includes(userId);
    const isMuted = mutedUsers.includes(userId);
    const isFavorite = favoriteUsers.includes(userId);
    const isArchived = archivedUsers.includes(userId);
    const hasUnread = unreadUsers.includes(userId);
    const isSelected = selectedUser?._id === userId;

    return [
      {
        icon: <User className="size-4 text-primary" />,
        label: "View Profile",
        action: () => navigate(`/user/${userId}`),
      },
      {
        icon: <Pin className={`size-4 ${isPinned ? "text-primary" : ""}`} />,
        label: isPinned ? "Unpin Chat" : "Pin Chat",
        action: () => togglePinnedUser(userId),
      },
      {
        icon: <MailOpen className="size-4" />,
        label: hasUnread ? "Mark as Read" : "Mark as Unread",
        action: () => (hasUnread ? clearUnread(userId) : markUnread(userId)),
      },
      {
        icon: <BellOff className={`size-4 ${isMuted ? "text-warning" : ""}`} />,
        label: isMuted ? "Unmute Notifications" : "Mute Notifications",
        action: () => toggleMutedUser(userId),
      },
      {
        icon: <Star className={`size-4 ${isFavorite ? "text-yellow-500" : ""}`} fill={isFavorite ? "currentColor" : "none"} />,
        label: isFavorite ? "Remove from Favorites" : "Add to Favorites",
        action: () => toggleFavoriteUser(userId),
      },
      {
        icon: <Archive className={`size-4 ${isArchived ? "text-info" : ""}`} />,
        label: isArchived ? "Unarchive Chat" : "Archive Chat",
        action: () => toggleArchivedUser(userId),
      },
      { divider: true },
      {
        icon: <Trash2 className="size-4 text-error" />,
        label: "Delete Chat",
        labelClass: "text-error",
        action: () => {
          toggleArchivedUser(userId);
          if (isSelected) setSelectedUser(null);
        },
      },
    ];
  };

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full md:w-20 lg:w-80 border-r border-base-300 flex flex-col bg-base-100 transition-all duration-200 relative">
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
        <div className="flex gap-1 overflow-x-auto pb-1 messages-scrollbar block md:hidden lg:flex">
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
          <button onClick={() => setActiveFilter("saved")} className={`btn btn-xs rounded-full whitespace-nowrap flex-shrink-0 ${activeFilter === "saved" ? "btn-primary" : "btn-ghost hover:bg-base-200"}`}><Star className="size-3" /> Saved</button>
        </div>
      </div>

      {searchQuery.trim().length >= 2 && (
        <div className="border-b border-base-300 max-h-72 overflow-y-auto bg-base-100 z-20">
          <p className="px-3 pt-2 text-[11px] font-semibold text-base-content/50">MESSAGES</p>
          {globalSearchLoading && <p className="p-3 text-xs text-base-content/50">Searching…</p>}
          {!globalSearchLoading && globalSearchResults.map((message) => {
            const sender = message.senderId; const receiver = message.receiverId;
            const conversation = String(sender?._id) === String(useAuthStore.getState().authUser?._id) ? receiver : sender;
            return <button key={message._id} onClick={() => { openMessageResult(message); setSearchQuery(""); }} className="w-full flex gap-2 p-3 text-left hover:bg-base-200"><MessageSquare className="size-4 text-primary mt-0.5 flex-shrink-0" /><div className="min-w-0"><p className="text-xs font-medium truncate">{conversation?.fullName || "Conversation"} · {sender?.fullName || "You"}</p><p className="text-xs text-base-content/60 truncate">{message.text || "Attachment"}</p><p className="text-[10px] text-base-content/40">{new Date(message.createdAt).toLocaleString()}</p></div></button>;
          })}
          {!globalSearchLoading && globalSearchResults.length === 0 && <p className="p-3 text-xs text-base-content/50">No messages found</p>}
          {globalSearchHasMore && <button className="btn btn-ghost btn-xs w-full mb-2" onClick={() => searchMessages(searchQuery, Math.floor(globalSearchResults.length / 20) + 1)}>Load more</button>}
        </div>
      )}

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto min-h-0 messages-scrollbar">
        {activeFilter === "saved" ? (
          savedMessages.length ? savedMessages.map((message) => <button key={message._id} className="w-full p-3 text-left hover:bg-base-200 border-b border-base-200" onClick={() => openMessageResult(message)}><p className="text-xs font-medium">{message.senderId?.fullName || "Unknown"}</p><p className="text-sm truncate">{message.text || "Attachment"}</p><p className="text-[10px] text-base-content/50">{new Date(message.createdAt).toLocaleString()}</p></button>) : <p className="p-5 text-center text-sm text-base-content/50">No saved messages</p>
        ) : sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-4 gap-2">
            <Users className="size-8 text-base-content/30" />
            <p className="text-sm text-base-content/50">
              {searchQuery ? "No contacts found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          sortedUsers.map((user) => {
            const userId = user._id;
            return (
              <SidebarItem
                key={userId}
                user={user}
                isSelected={selectedUser?._id === userId}
                isMenuOpen={activeMenu?.user?._id === userId}
                isOnline={isOnline(userId)}
                isPinned={pinnedUsers.includes(userId)}
                isMuted={mutedUsers.includes(userId)}
                isFavorite={favoriteUsers.includes(userId)}
                unreadCount={unreadCounts[userId] || user.unreadCount || 0}
                onSelect={() => {
                  setSelectedUser(user);
                  handleCloseMenu();
                }}
                onOpenMenu={handleOpenMenu}
              />
            );
          })
        )}
      </div>

      {/* Global Floating Context Menu Portal */}
      {activeMenu && (
        <ContextMenuPortal
          triggerRect={activeMenu.triggerRect}
          menuItems={getMenuItemsForUser(activeMenu.user)}
          onClose={handleCloseMenu}
          title={`Options for ${activeMenu.user?.fullName}`}
        />
      )}
    </aside>
  );
};

export default Sidebar;
