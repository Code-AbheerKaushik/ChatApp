import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// --- Helpers: Persist local state to localStorage ---
const loadLocal = (key, fallback = []) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};
const saveLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  // --- Search & Filter ---
  searchQuery: "",
  activeFilter: "all", // "all" | "unread" | "pinned" | "favorites" | "archived" | "muted" | "online"

  // --- Local user states (persisted to localStorage) ---
  pinnedUsers: loadLocal("chatty_pinned"),
  archivedUsers: loadLocal("chatty_archived"),
  mutedUsers: loadLocal("chatty_muted"),
  favoriteUsers: loadLocal("chatty_favorites"),
  unreadUsers: loadLocal("chatty_unread"),  // user IDs with unread messages

  // --- Reply-to state ---
  replyToMessage: null,

  // --- Typing indicator ---
  typingUsers: {}, // { userId: true }

  // --- Conversation search ---
  conversationSearchQuery: "",
  conversationSearchOpen: false,

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveFilter: (f) => set({ activeFilter: f }),
  setConversationSearch: (q) => set({ conversationSearchQuery: q }),
  toggleConversationSearch: () => set((s) => ({ conversationSearchOpen: !s.conversationSearchOpen, conversationSearchQuery: "" })),

  setReplyToMessage: (msg) => set({ replyToMessage: msg }),
  clearReplyToMessage: () => set({ replyToMessage: null }),

  // --- Toggle user list flags ---
  togglePinnedUser: (userId) => {
    const prev = get().pinnedUsers;
    const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
    saveLocal("chatty_pinned", next);
    set({ pinnedUsers: next });
  },
  toggleArchivedUser: (userId) => {
    const prev = get().archivedUsers;
    const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
    saveLocal("chatty_archived", next);
    set({ archivedUsers: next });
  },
  toggleMutedUser: (userId) => {
    const prev = get().mutedUsers;
    const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
    saveLocal("chatty_muted", next);
    set({ mutedUsers: next });
  },
  toggleFavoriteUser: (userId) => {
    const prev = get().favoriteUsers;
    const next = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
    saveLocal("chatty_favorites", next);
    set({ favoriteUsers: next });
  },
  markUnread: (userId) => {
    const prev = get().unreadUsers;
    if (!prev.includes(userId)) {
      const next = [...prev, userId];
      saveLocal("chatty_unread", next);
      set({ unreadUsers: next });
    }
  },
  clearUnread: (userId) => {
    const next = get().unreadUsers.filter(id => id !== userId);
    saveLocal("chatty_unread", next);
    set({ unreadUsers: next });
  },

  // --- API calls ---
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      // Clear unread when opening a conversation
      get().clearUnread(userId);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
      // Update last message on user card
      set((state) => ({
        users: state.users.map(u =>
          u._id === selectedUser._id ? { ...u, lastMessage: res.data } : u
        )
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.put(`/messages/edit/${messageId}`, { text });
      set((state) => ({
        messages: state.messages.map(m => m._id === messageId ? res.data : m)
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to edit message");
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      set((state) => ({
        messages: state.messages.filter(m => m._id !== messageId)
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      set((state) => ({
        messages: state.messages.map(m => m._id === messageId ? res.data : m)
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to react");
    }
  },

  togglePinMessage: async (messageId) => {
    try {
      const res = await axiosInstance.put(`/messages/pin/${messageId}`);
      set((state) => ({
        messages: state.messages.map(m => m._id === messageId ? res.data : m)
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to pin message");
    }
  },

  // --- Socket subscriptions ---
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isFromSelectedUser =
        newMessage.senderId === selectedUser._id ||
        newMessage.receiverId === selectedUser._id;
      if (!isFromSelectedUser) {
        // Mark sender as unread when not in conversation
        get().markUnread(newMessage.senderId);
        // Update lastMessage on user card
        set((state) => ({
          users: state.users.map(u =>
            u._id === newMessage.senderId ? { ...u, lastMessage: newMessage } : u
          )
        }));
        return;
      }
      set({ messages: [...get().messages, newMessage] });
      set((state) => ({
        users: state.users.map(u =>
          u._id === selectedUser._id ? { ...u, lastMessage: newMessage } : u
        )
      }));
    });

    socket.on("messageEdited", (updatedMsg) => {
      set((state) => ({
        messages: state.messages.map(m => m._id === updatedMsg._id ? updatedMsg : m)
      }));
    });

    socket.on("messageDeleted", (deletedMsgId) => {
      set((state) => ({
        messages: state.messages.filter(m => m._id !== deletedMsgId)
      }));
    });

    socket.on("messageReaction", (updatedMsg) => {
      set((state) => ({
        messages: state.messages.map(m => m._id === updatedMsg._id ? updatedMsg : m)
      }));
    });

    socket.on("messagePinned", (updatedMsg) => {
      set((state) => ({
        messages: state.messages.map(m => m._id === updatedMsg._id ? updatedMsg : m)
      }));
    });

    socket.on("typing", ({ senderId }) => {
      if (senderId === selectedUser._id) {
        set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: true } }));
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      set((state) => {
        const next = { ...state.typingUsers };
        delete next[senderId];
        return { typingUsers: next };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("messageReaction");
    socket.off("messagePinned");
    socket.off("typing");
    socket.off("stopTyping");
  },

  // Emit typing indicator
  emitTyping: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    const socket = useAuthStore.getState().socket;
    socket?.emit("typing", { receiverId: selectedUser._id });
  },
  emitStopTyping: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    const socket = useAuthStore.getState().socket;
    socket?.emit("stopTyping", { receiverId: selectedUser._id });
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser, conversationSearchQuery: "", conversationSearchOpen: false, replyToMessage: null });
    if (selectedUser) get().clearUnread(selectedUser._id);
  },
}));
