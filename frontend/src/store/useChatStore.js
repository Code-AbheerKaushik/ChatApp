import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { playIncomingSound } from "../lib/sound";

// --- Helpers: Persist local state to localStorage ---
const loadLocal = (key, fallback = []) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};
const saveLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));

// Generate a unique client-side message ID for idempotency
const generateClientMessageId = () =>
  `cmid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
let latestSearchRequest = 0;

// Optimistically compute reactions for a message without waiting for server
const applyOptimisticReaction = (message, userId, emoji) => {
  const reactions = [...(message.reactions || [])];
  const existingIdx = reactions.findIndex(
    (r) => String(r.userId) === String(userId) || (r.userId?._id && String(r.userId._id) === String(userId))
  );

  if (existingIdx > -1) {
    if (reactions[existingIdx].emoji === emoji) {
      // Toggle off same emoji
      reactions.splice(existingIdx, 1);
    } else {
      // Change to new emoji
      reactions[existingIdx] = { ...reactions[existingIdx], emoji };
    }
  } else {
    // Add new reaction
    reactions.push({ userId, emoji, _id: `opt_${Date.now()}` });
  }
  return { ...message, reactions };
};

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
  globalSearchResults: [],
  globalSearchHasMore: false,
  globalSearchLoading: false,
  navigationTargetMessageId: null,
  savedMessagesVersion: 0,

  // --- In-flight reaction locks (prevent rapid duplicate calls) ---
  _reactionInFlight: {}, // { messageId: emoji }

  // --- Unread Counts ---
  unreadCounts: {}, // { [userId]: count }

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveFilter: (f) => set({ activeFilter: f }),
  setConversationSearch: (q) => set({ conversationSearchQuery: q }),
  toggleConversationSearch: () => set((s) => ({ conversationSearchOpen: !s.conversationSearchOpen, conversationSearchQuery: "" })),

  setReplyToMessage: (msg) => set({ replyToMessage: msg }),
  clearReplyToMessage: () => set({ replyToMessage: null }),
  getDraft: (conversationId) => loadLocal(`chatty_draft_${conversationId}`, ""),
  saveDraft: (conversationId, draft) => {
    if (!conversationId) return;
    if (draft) localStorage.setItem(`chatty_draft_${conversationId}`, JSON.stringify(draft));
    else localStorage.removeItem(`chatty_draft_${conversationId}`);
  },
  searchMessages: async (query, page = 1) => {
    const requestId = ++latestSearchRequest;
    if (query.trim().length < 2) return set({ globalSearchResults: [], globalSearchHasMore: false });
    set({ globalSearchLoading: true });
    try {
      const res = await axiosInstance.get("/messages/search", { params: { q: query, page } });
      if (requestId !== latestSearchRequest) return;
      set((state) => ({
        globalSearchResults: page === 1 ? res.data.results : [...state.globalSearchResults, ...res.data.results],
        globalSearchHasMore: res.data.hasMore,
      }));
    } catch { if (requestId === latestSearchRequest) toast.error("Message search failed"); }
    finally { if (requestId === latestSearchRequest) set({ globalSearchLoading: false }); }
  },
  openMessageResult: (message) => {
    const authUser = useAuthStore.getState().authUser;
    const sender = message.senderId?._id || message.senderId;
    const receiver = message.receiverId?._id || message.receiverId;
    const conversationId = String(sender) === String(authUser._id) ? receiver : sender;
    const user = get().users.find((candidate) => String(candidate._id) === String(conversationId));
    if (user) get().setSelectedUser(user);
    set({ navigationTargetMessageId: message._id, globalSearchResults: [] });
  },
  clearNavigationTarget: () => set({ navigationTargetMessageId: null }),

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
    // Increment count
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: (state.unreadCounts[userId] || 0) + 1,
      },
      users: state.users.map(u =>
        String(u._id) === String(userId) ? { ...u, unreadCount: (u.unreadCount || 0) + 1 } : u
      ),
    }));
  },
  clearUnread: (userId) => {
    const next = get().unreadUsers.filter(id => id !== userId);
    saveLocal("chatty_unread", next);
    set((state) => ({
      unreadUsers: next,
      unreadCounts: {
        ...state.unreadCounts,
        [userId]: 0,
      },
      users: state.users.map(u =>
        String(u._id) === String(userId) ? { ...u, unreadCount: 0 } : u
      ),
    }));
  },

  // --- API calls ---
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      const counts = {};
      res.data.forEach((u) => {
        counts[u._id] = u.unreadCount || 0;
      });
      set({ users: res.data, unreadCounts: counts });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load users");
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
      await get().markMessagesAsRead(userId);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  getMessageContext: async (messageId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/around/${messageId}`);
      set({ messages: res.data.messages, navigationTargetMessageId: res.data.targetId });
    } catch (error) {
      toast.error(error?.response?.data?.error || "Failed to load message location");
    } finally { set({ isMessagesLoading: false }); }
  },

  markMessagesAsRead: async (senderId) => {
    try {
      await axiosInstance.put(`/messages/read/${senderId}`);
      set((state) => ({
        unreadCounts: { ...state.unreadCounts, [senderId]: 0 },
        unreadUsers: state.unreadUsers.filter(id => id !== senderId),
        users: state.users.map(u =>
          String(u._id) === String(senderId) ? { ...u, unreadCount: 0 } : u
        ),
      }));
      saveLocal("chatty_unread", get().unreadUsers);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  // --- Optimistic sendMessage ---
  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const authUser = useAuthStore.getState().authUser;

    // Generate idempotency key
    const clientMessageId = generateClientMessageId();

    // Build optimistic message to show instantly
    const optimisticMsg = {
      _id: clientMessageId,           // Temporary local ID
      clientMessageId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text || null,
      image: messageData.image ? messageData.image : null, // local data URL for preview
      file: messageData.file ? messageData.file : null,
      fileType: messageData.fileType || null,
      media: (messageData.media || []).map((media) => ({ ...media, url: media.data, fileName: media.name, mimeType: media.type, kind: media.type?.startsWith("image/") ? "image" : media.type?.startsWith("video/") ? "video" : media.type?.startsWith("audio/") ? "audio" : "document" })),
      replyTo: get().replyToMessage || null,
      reactions: [],
      createdAt: new Date().toISOString(),
      status: "sending",             // optimistic status
    };

    // Immediately add optimistic message to state
    set((state) => ({
      messages: [...state.messages, optimisticMsg],
      users: state.users.map(u =>
        u._id === selectedUser._id ? { ...u, lastMessage: optimisticMsg } : u
      ),
    }));

    try {
      const payload = { ...messageData, clientMessageId };
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
      const serverMsg = { ...res.data, status: "sent" };

      // Replace optimistic message with server-confirmed message, matching by clientMessageId
      set((state) => {
        // Deduplicate: don't add if the real _id already exists (socket may have delivered it)
        const alreadyHasReal = state.messages.some(
          (m) => m._id === serverMsg._id && m._id !== clientMessageId
        );
        if (alreadyHasReal) {
          // Just remove the optimistic placeholder
          return {
            messages: state.messages.filter((m) => m._id !== clientMessageId),
            users: state.users.map(u =>
              u._id === selectedUser._id ? { ...u, lastMessage: serverMsg } : u
            ),
          };
        }
        return {
          messages: state.messages.map((m) =>
            m._id === clientMessageId ? serverMsg : m
          ),
          users: state.users.map(u =>
            u._id === selectedUser._id ? { ...u, lastMessage: serverMsg } : u
          ),
        };
      });
    } catch (error) {
      // Mark optimistic message as failed
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === clientMessageId ? { ...m, status: "failed" } : m
        ),
      }));
      toast.error("Failed to send — tap to retry");
      return false;
    }
    return true;
  },

  // --- Retry a failed message ---
  retrySendMessage: async (failedMessage) => {
    const { selectedUser } = get();

    // Mark as sending again
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === failedMessage._id ? { ...m, status: "sending" } : m
      ),
    }));

    try {
      const payload = {
        text: failedMessage.text,
        image: failedMessage.image,
        file: failedMessage.file,
        fileType: failedMessage.fileType,
        media: failedMessage.media?.map((media) => ({ name: media.name || media.fileName, type: media.type || media.mimeType, size: media.size, data: media.data || media.url })).filter((media) => media.data) || [],
        replyTo: failedMessage.replyTo?._id || failedMessage.replyTo || undefined,
        clientMessageId: failedMessage.clientMessageId, // Same ID = idempotency on backend
      };
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
      const serverMsg = { ...res.data, status: "sent" };

      set((state) => {
        const alreadyHasReal = state.messages.some(
          (m) => m._id === serverMsg._id && m._id !== failedMessage._id
        );
        if (alreadyHasReal) {
          return {
            messages: state.messages.filter((m) => m._id !== failedMessage._id),
            users: state.users.map(u =>
              u._id === selectedUser._id ? { ...u, lastMessage: serverMsg } : u
            ),
          };
        }
        return {
          messages: state.messages.map((m) =>
            m._id === failedMessage._id ? serverMsg : m
          ),
          users: state.users.map(u =>
            u._id === selectedUser._id ? { ...u, lastMessage: serverMsg } : u
          ),
        };
      });
    } catch (error) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === failedMessage._id ? { ...m, status: "failed" } : m
        ),
      }));
      toast.error("Retry failed — check your connection");
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

  // --- Optimistic reactToMessage ---
  reactToMessage: async (messageId, emoji) => {
    const authUser = useAuthStore.getState().authUser;
    const inFlight = get()._reactionInFlight;

    // Only block if EXACTLY this emoji for this message is already in-flight
    // (prevents double-fire from accidental double-tap).
    // Changing to a different emoji is always allowed.
    if (inFlight[messageId] === emoji) return;

    // Save snapshot for rollback
    const snapshot = get().messages;

    // Apply optimistic update immediately (0ms latency)
    set((state) => ({
      _reactionInFlight: { ...state._reactionInFlight, [messageId]: emoji },
      messages: state.messages.map((m) =>
        m._id === messageId ? applyOptimisticReaction(m, authUser._id, emoji) : m
      ),
    }));

    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      // Reconcile with server truth
      set((state) => {
        const nextInFlight = { ...state._reactionInFlight };
        delete nextInFlight[messageId];
        return {
          _reactionInFlight: nextInFlight,
          // Server response is authoritative — replaces optimistic state
          messages: state.messages.map((m) => m._id === messageId ? { ...res.data, status: m.status } : m),
        };
      });
    } catch (error) {
      // Rollback to pre-optimistic state
      set((state) => {
        const nextInFlight = { ...state._reactionInFlight };
        delete nextInFlight[messageId];
        return {
          _reactionInFlight: nextInFlight,
          messages: snapshot,
        };
      });
      toast.error("Failed to react — try again");
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
  toggleStarMessage: async (messageId) => {
    const authUser = useAuthStore.getState().authUser;
    const before = get().messages;
    set((state) => ({ messages: state.messages.map((m) => {
      if (m._id !== messageId) return m;
      const starredBy = [...(m.starredBy || [])];
      const i = starredBy.findIndex((id) => String(id?._id || id) === String(authUser._id));
      if (i >= 0) starredBy.splice(i, 1); else starredBy.push(authUser._id);
      return { ...m, starredBy };
    }) }));
    try {
      const res = await axiosInstance.put(`/messages/star/${messageId}`);
      set((state) => ({ messages: state.messages.map((m) => m._id === messageId ? { ...res.data, status: m.status } : m), savedMessagesVersion: state.savedMessagesVersion + 1 }));
    } catch { set({ messages: before }); toast.error("Could not update saved message"); }
  },
  forwardMessage: async (message, recipientIds) => {
    const clientForwardId = generateClientMessageId();
    const selectedUser = get().selectedUser;
    const activeDestination = selectedUser && recipientIds.some((id) => String(id) === String(selectedUser._id));
    const temporaryId = `forward_${clientForwardId}`;
    if (activeDestination) set((state) => ({
      messages: [...state.messages, {
        ...message, _id: temporaryId, senderId: useAuthStore.getState().authUser._id,
        receiverId: selectedUser._id, clientMessageId: clientForwardId,
        forwardedFrom: { messageId: message._id }, status: "sending",
        forwardPayload: { sourceId: message._id, recipientIds },
      }],
    }));
    try {
      const res = await axiosInstance.post(`/messages/forward/${message._id}`, { recipientIds, clientForwardId });
      if (activeDestination) {
        const confirmed = res.data.find((item) => String(item.receiverId?._id || item.receiverId) === String(selectedUser._id));
        if (confirmed) set((state) => ({ messages: state.messages.map((item) => item._id === temporaryId ? confirmed : item) }));
      }
      toast.success(`Forwarded to ${recipientIds.length} conversation${recipientIds.length === 1 ? "" : "s"}`);
    } catch (error) {
      if (activeDestination) set((state) => ({ messages: state.messages.map((item) => item._id === temporaryId ? { ...item, status: "failed" } : item) }));
      toast.error(error.response?.data?.error || "Forward failed — try again");
      throw error;
    }
  },
  retryForwardMessage: async (failedMessage) => {
    if (!failedMessage.forwardPayload) return;
    set((state) => ({ messages: state.messages.filter((message) => message._id !== failedMessage._id) }));
    return get().forwardMessage({ _id: failedMessage.forwardPayload.sourceId }, failedMessage.forwardPayload.recipientIds);
  },

  // --- Socket subscriptions ---
  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Guard: socket may not be connected yet

    // Always clean up existing listeners before re-subscribing to avoid duplicates
    socket.off("newMessage");
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("messageReaction");
    socket.off("messagePinned");
    socket.off("typing");
    socket.off("stopTyping");

    const selectedUserId = String(selectedUser._id);

    socket.on("newMessage", (newMessage) => {
      const msgSenderId = String(newMessage.senderId?._id ?? newMessage.senderId);
      const msgReceiverId = String(newMessage.receiverId?._id ?? newMessage.receiverId);
      const authUserId = String(useAuthStore.getState().authUser?._id || "");

      // Play in-app notification sound for incoming non-own messages
      if (msgSenderId !== authUserId) {
        playIncomingSound(newMessage);
      }

      const isRelevant =
        msgSenderId === selectedUserId ||
        msgReceiverId === selectedUserId;

      if (!isRelevant) {
        // Message is from a different conversation — mark as unread on the sidebar
        get().markUnread(msgSenderId);
        set((state) => ({
          users: state.users.map(u =>
            String(u._id) === msgSenderId ? { ...u, lastMessage: newMessage } : u
          )
        }));
        return;
      }

      set((state) => {
        const msgs = state.messages;

        // Deduplication: if exact _id already in state, skip entirely
        if (msgs.some((m) => m._id === newMessage._id)) return {};

        // Deduplication by clientMessageId: replace optimistic placeholder in-place
        if (newMessage.clientMessageId) {
          const optimisticIdx = msgs.findIndex(
            (m) => m.clientMessageId === newMessage.clientMessageId
          );
          if (optimisticIdx > -1) {
            const updatedMsgs = [...msgs];
            updatedMsgs[optimisticIdx] = { ...newMessage, status: "sent" };
            return {
              messages: updatedMsgs,
              users: state.users.map(u =>
                String(u._id) === selectedUserId ? { ...u, lastMessage: newMessage } : u
              ),
            };
          }
        }

        // Brand new incoming message from the other party
        // If we are currently viewing this conversation, mark it as read immediately
        if (msgSenderId === selectedUserId) {
          get().markMessagesAsRead(selectedUserId);
        }

        return {
          messages: [...msgs, { ...newMessage, status: msgSenderId === selectedUserId ? "read" : newMessage.status || "sent" }],
          users: state.users.map(u =>
            String(u._id) === selectedUserId ? { ...u, lastMessage: newMessage } : u
          ),
        };
      });
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
      if (String(senderId) === selectedUserId) {
        set((state) => ({ typingUsers: { ...state.typingUsers, [senderId]: true } }));
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (String(senderId) === selectedUserId) {
        set((state) => {
          const next = { ...state.typingUsers };
          delete next[senderId];
          return { typingUsers: next };
        });
      }
    });

    // Update contact list when a user updates their profile
    socket.on("userProfileUpdated", ({ userId, updatedUser }) => {
      set((state) => ({
        users: state.users.map((u) =>
          String(u._id) === String(userId)
            ? {
                ...u,
                fullName: updatedUser.fullName ?? u.fullName,
                profilePic: updatedUser.profilePic ?? u.profilePic,
                username: updatedUser.username ?? u.username,
                profile: { ...u.profile, ...updatedUser.profile },
              }
            : u
        ),
        // Update selectedUser if they changed their profile
        selectedUser:
          state.selectedUser && String(state.selectedUser._id) === String(userId)
            ? {
                ...state.selectedUser,
                fullName: updatedUser.fullName ?? state.selectedUser.fullName,
                profilePic: updatedUser.profilePic ?? state.selectedUser.profilePic,
                username: updatedUser.username ?? state.selectedUser.username,
              }
            : state.selectedUser,
      }));
    });

    // Delivery and Read Receipt Listeners
    socket.on("messagesDelivered", ({ messageIds }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          messageIds.includes(m._id) && m.status !== "read"
            ? { ...m, status: "delivered", deliveredAt: new Date() }
            : m
        ),
      }));
    });

    socket.on("messagesRead", ({ messageIds }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          messageIds.includes(m._id) ? { ...m, status: "read", readAt: new Date() } : m
        ),
      }));
    });

    // Disappearing message expiration real-time listener
    socket.on("messageExpired", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
    });

    socket.on("groupMessageExpired", ({ groupId, messageId }) => {
      useGroupStore.getState().handleGroupMessageExpired({ groupId, messageId });
    });

    socket.on("newGroupMessage", ({ groupId, message }) => {
      const authUserId = String(useAuthStore.getState().authUser?._id || "");
      const msgSenderId = String(message.senderId?._id ?? message.senderId);

      if (msgSenderId !== authUserId) {
        playIncomingSound(message);
      }

      const selectedGroup = useGroupStore.getState().selectedGroup;
      if (selectedGroup && String(selectedGroup._id) === String(groupId)) {
        useGroupStore.setState((state) => ({
          groupMessages: state.groupMessages.some((m) => m._id === message._id)
            ? state.groupMessages
            : [...state.groupMessages, message],
        }));
      }
    });

    socket.on("newGroupCreated", (group) => {
      useGroupStore.setState((state) => ({
        groups: [group, ...state.groups],
      }));
    });

    socket.on("groupUpdated", (group) => {
      useGroupStore.getState().handleGroupUpdated(group);
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return; // Guard: socket may be null during reconnection
    socket.off("newMessage");
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("messageReaction");
    socket.off("messagePinned");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("userProfileUpdated");
    socket.off("messagesDelivered");
    socket.off("messagesRead");
    socket.off("userOffline");
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
    // Clear navigationTargetMessageId so a stale target doesn't
    // trigger getMessageContext when switching to a new conversation.
    // openMessageResult() re-sets it immediately after calling setSelectedUser.
    set({ selectedUser, conversationSearchQuery: "", conversationSearchOpen: false, replyToMessage: null, navigationTargetMessageId: null });
    if (selectedUser) {
      get().clearUnread(selectedUser._id);
      get().markMessagesAsRead(selectedUser._id);
    }
  },
}));
