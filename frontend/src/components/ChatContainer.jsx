import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useEffect, useRef, useState, useCallback } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import GroupSettingsModal from "./GroupSettingsModal";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Reply, Pencil, Trash2, SmilePlus, Pin, Copy, X, ChevronDown, ArrowDown, Clock, AlertCircle, RotateCcw, Check, CheckCheck, Forward, Star } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import MediaMessage, { mediaUrl } from "./MediaMessage";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

const MessageBubble = ({ message, isOwn, authUser, selectedUser, onReply, onEdit, onDelete, onReact, onPin, onStar, onForward, onRetry, onOpenImage, conversationSearchQuery, isTarget }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const menuRef = useRef(null);
  const pointerRef = useRef(null);
  const longPressRef = useRef(null);
  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  const highlight = (text) => {
    if (!conversationSearchQuery || !text) return text;
    const parts = text.split(new RegExp(`(${conversationSearchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === conversationSearchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-300 text-black rounded-sm">{part}</mark>
        : part
    );
  };

  const replyPreview = message.replyTo;
  const isStarred = (message.starredBy || []).some((id) => String(id?._id || id) === String(authUser._id));
  const clearGesture = () => { clearTimeout(longPressRef.current); longPressRef.current = null; pointerRef.current = null; };
  const onPointerDown = (event) => {
    if (event.pointerType !== "touch") return;
    pointerRef.current = { x: event.clientX, y: event.clientY, triggered: false };
    longPressRef.current = setTimeout(() => {
      if (pointerRef.current) { pointerRef.current.triggered = true; setMenuOpen(true); navigator.vibrate?.(20); }
    }, 550);
  };
  const onPointerMove = (event) => {
    const start = pointerRef.current;
    if (!start || start.cancelled) return;
    const dx = event.clientX - start.x; const dy = event.clientY - start.y;
    // Cancel if primarily vertical (scrolling) — set flag so swipe cannot fire afterwards
    if (Math.abs(dy) > 20) {
      clearTimeout(longPressRef.current); longPressRef.current = null;
      start.cancelled = true; return;
    }
    // Cancel long-press if moved too far horizontally without a clean swipe ratio
    if (Math.abs(dx) > 100 && Math.abs(dx) <= Math.abs(dy) * 2) {
      clearTimeout(longPressRef.current); longPressRef.current = null;
      start.cancelled = true; return;
    }
    // Trigger swipe-to-reply: clean rightward horizontal swipe
    if (!start.triggered && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 2) {
      start.triggered = true; start.cancelled = true;
      clearTimeout(longPressRef.current); onReply(message); navigator.vibrate?.(10);
    }
  };

  return (
    <div
      data-message-id={message._id}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={clearGesture} onPointerCancel={clearGesture}
      onContextMenu={(e) => e.preventDefault()}
      className={`group flex items-end gap-2 relative ${isOwn ? "flex-row-reverse" : "flex-row"} ${isTarget ? "animate-pulse rounded-xl ring-2 ring-warning/70" : ""}`}
    >
      {/* Avatar */}
      <img
        src={isOwn ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
        alt="avatar"
        className="size-8 rounded-full object-cover flex-shrink-0 self-end mb-1"
      />

      <div className={`flex flex-col max-w-[80%] sm:max-w-[65%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Pinned indicator */}
        {message.isPinned && (
          <div className="flex items-center gap-1 text-[11px] text-primary mb-0.5">
            <Pin className="size-3" /> <span>Pinned</span>
          </div>
        )}
        {message.forwardedFrom && <div className="text-[11px] text-base-content/50 mb-0.5">Forwarded</div>}

        {/* Reply preview */}
        {replyPreview && (
          <div className="text-xs px-2.5 py-1 rounded-lg mb-1 border-l-2 border-primary bg-base-200/80 max-w-full truncate">
            <span className="font-medium text-primary">Reply</span>
            <p className="truncate text-base-content/60">{replyPreview.text || "📎 Attachment"}</p>
          </div>
        )}

        {/* Message Bubble */}
        <div className="relative">
          <div
            className={`chat-bubble relative rounded-2xl px-3.5 py-2 shadow-sm ${
              isOwn
                ? "bg-primary text-primary-content rounded-br-xs"
                : "bg-base-200 text-base-content rounded-bl-xs"
            }`}
          >
            <MediaMessage message={message} onOpenImage={onOpenImage} />

            {/* Text */}
            {message.text && (
              <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{highlight(message.text)}</p>
            )}

            {/* Timestamp + status + edited */}
            <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
              <time className={`text-[10px] ${isOwn ? "text-primary-content/70" : "text-base-content/50"}`}>
                {formatMessageTime(message.createdAt)}
              </time>
              {message.edited && (
                <span className={`text-[10px] italic ${isOwn ? "text-primary-content/60" : "text-base-content/40"}`}>edited</span>
              )}
              {/* Sending / Failed status indicators for own messages */}
              {isOwn && isSending && (
                <Clock className="size-3 text-primary-content/50 animate-pulse" aria-label="Sending..." />
              )}
              {isOwn && isFailed && (
                <AlertCircle className="size-3 text-error" aria-label="Failed to send" />
              )}
              {/* Delivery and Read receipts checkmarks for own messages */}
              {isOwn && !isSending && !isFailed && (
                <span className="ml-0.5 flex items-center">
                  {message.status === "read" ? (
                    <CheckCheck className="size-3.5 text-blue-400" aria-label="Read" />
                  ) : message.status === "delivered" ? (
                    <CheckCheck className="size-3.5 text-primary-content/60" aria-label="Delivered" />
                  ) : (
                    <Check className="size-3.5 text-primary-content/60" aria-label="Sent" />
                  )}
                </span>
              )}
            </div>
          </div>

          {pickerOpen && !isSending && !isFailed && (
            <div className={`absolute z-40 bottom-full mb-2 ${isOwn ? "right-0" : "left-0"}`}>
              <EmojiPicker onEmojiClick={(emoji) => { onReact(message._id, emoji.emoji); setPickerOpen(false); }} width={300} height={360} lazyLoadEmojis />
            </div>
          )}

          {/* Quick Emoji Bar on Hover (positioned above bubble) */}
          <div
            className={`absolute ${isOwn ? "right-0" : "left-0"} -top-7 hidden group-hover:flex items-center gap-1 z-20`}
          >
            <div className="flex items-center bg-base-100/95 backdrop-blur-md border border-base-300 rounded-full shadow-md px-1.5 py-0.5 gap-0.5">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message._id, emoji)}
                  className="text-xs sm:text-sm hover:scale-125 transition-transform px-0.5"
                >
                  {emoji}
                </button>
              ))}
              <button onClick={() => setPickerOpen((open) => !open)} className="text-sm px-0.5" aria-label="More reactions"><SmilePlus className="size-3.5" /></button>
            </div>
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 mb-0.5">
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => !isSending && !isFailed && onReact(message._id, emoji)}
                className="bg-base-200 hover:bg-base-300 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 transition-colors border border-base-300"
              >
                {emoji} <span className="text-base-content/60">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Failed message retry button */}
        {isOwn && isFailed && (
          <button
            onClick={() => onRetry(message)}
            className="mt-1 flex items-center gap-1 text-[11px] text-error hover:text-error/80 transition-colors"
          >
            <RotateCcw className="size-3" /> Tap to retry
          </button>
        )}
      </div>

      {/* Message Context Menu */}
      <div
        className={`self-center transition-opacity flex-shrink-0 ${menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        ref={menuRef}
      >
        <div className="relative">
          <button className="btn btn-ghost btn-xs btn-circle" tabIndex={0} onClick={() => setMenuOpen((open) => !open)} aria-label="Message options">
            <ChevronDown className="size-3.5" />
          </button>
          {menuOpen && <ul className="absolute right-0 top-full mt-1 z-30 menu p-1 shadow-lg bg-base-100 rounded-xl border border-base-300 w-36 text-sm">
            <li>
              <button className="flex items-center gap-2" onClick={() => onReply(message)}>
                <Reply className="size-3.5" /> Reply
              </button>
            </li>
            <li><button className="flex items-center gap-2" onClick={() => { setPickerOpen(true); setMenuOpen(false); }}><SmilePlus className="size-3.5" /> React</button></li>
            <li><button className="flex items-center gap-2" onClick={() => { onForward(message); setMenuOpen(false); }}><Forward className="size-3.5" /> Forward</button></li>
            {isOwn && (
              <li>
                <button className="flex items-center gap-2" onClick={() => onEdit(message)}>
                  <Pencil className="size-3.5" /> Edit
                </button>
              </li>
            )}
            <li>
              <button
                className="flex items-center gap-2"
                onClick={() => navigator.clipboard.writeText(message.text || "")}
              >
                <Copy className="size-3.5" /> Copy
              </button>
            </li>
            <li><button className="flex items-center gap-2" onClick={() => { onStar(message._id); setMenuOpen(false); }}><Star className="size-3.5" fill={isStarred ? "currentColor" : "none"} /> {isStarred ? "Unstar" : "Star"}</button></li>
            <li>
              <button className="flex items-center gap-2" onClick={() => onPin(message._id)}>
                <Pin className="size-3.5" /> {message.isPinned ? "Unpin" : "Pin"}
              </button>
            </li>
            {isOwn && (
              <li>
                <button className="flex items-center gap-2 text-error" onClick={() => onDelete(message._id)}>
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </li>
            )}
          </ul>}
        </div>
      </div>
    </div>
  );
};

const ImageLightbox = ({ gallery, index, onClose }) => {
  const [active, setActive] = useState(index); const [scale, setScale] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const start = useRef(null); const pointers = useRef(new Map()); const pinchDistance = useRef(null); const image = gallery[active];
  useEffect(() => { const key = (event) => { if (event.key === "Escape") onClose(); if (event.key === "ArrowLeft") setActive((value) => Math.max(0, value - 1)); if (event.key === "ArrowRight") setActive((value) => Math.min(gallery.length - 1, value + 1)); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [gallery.length, onClose]);
  useEffect(() => { setScale(1); setLoading(true); setError(false); }, [active]);
  return <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center touch-none" onClick={onClose} onWheel={(event) => { event.preventDefault(); setScale((value) => Math.min(4, Math.max(1, value - event.deltaY * .002))); }} onPointerDown={(event) => { pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 1) start.current = { x: event.clientX, y: event.clientY }; if (pointers.current.size === 2) { const values = [...pointers.current.values()]; pinchDistance.current = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y); } }} onPointerMove={(event) => { if (!pointers.current.has(event.pointerId)) return; pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); if (pointers.current.size === 2) { const values = [...pointers.current.values()]; const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y); if (pinchDistance.current) setScale((value) => Math.min(4, Math.max(1, value * distance / pinchDistance.current))); pinchDistance.current = distance; } }} onPointerUp={(event) => { pointers.current.delete(event.pointerId); pinchDistance.current = null; if (!start.current || pointers.current.size) return; const dx = event.clientX - start.current.x; if (Math.abs(dx) > 60 && scale === 1) setActive((value) => Math.max(0, Math.min(gallery.length - 1, value + (dx > 0 ? -1 : 1)))); start.current = null; }}>
    <button className="absolute top-4 right-4 btn btn-circle btn-sm z-10" onClick={onClose}><X className="size-5" /></button>
    {active > 0 && <button className="absolute left-3 btn btn-circle z-10 hidden sm:flex" onClick={(event) => { event.stopPropagation(); setActive(active - 1); }}>‹</button>}
    {loading && <span className="loading loading-spinner loading-lg text-white" />}{error && <p className="text-white">Image could not be loaded.</p>}<img src={mediaUrl(image)} alt={image.fileName || "Image"} className={`max-w-[96vw] max-h-[90vh] object-contain transition-transform ${loading || error ? "hidden" : ""}`} style={{ transform: `scale(${scale})` }} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setError(true); }} onClick={(event) => event.stopPropagation()} />
    {active < gallery.length - 1 && <button className="absolute right-3 btn btn-circle z-10 hidden sm:flex" onClick={(event) => { event.stopPropagation(); setActive(active + 1); }}>›</button>}
    <div className="absolute bottom-4 flex gap-2 items-center text-white text-xs"><button className="btn btn-xs" onClick={(event) => { event.stopPropagation(); setScale((value) => Math.max(1, value - .5)); }}>−</button><span>{active + 1}/{gallery.length} · {Math.round(scale * 100)}%</span><button className="btn btn-xs" onClick={(event) => { event.stopPropagation(); setScale((value) => Math.min(4, value + .5)); }}>+</button></div>
  </div>;
};

const ChatContainer = () => {
  const {
    messages, getMessages, getMessageContext, isMessagesLoading,
    selectedUser, subscribeToMessages, unsubscribeFromMessages,
    editMessage, deleteMessage, reactToMessage, togglePinMessage,
    setReplyToMessage, retrySendMessage, retryForwardMessage,
    conversationSearchQuery, toggleStarMessage, forwardMessage, users,
    navigationTargetMessageId, clearNavigationTarget,
  } = useChatStore();
  const { selectedGroup, groupMessages, getGroupMessages, isGroupMessagesLoading } = useGroupStore();
  const { authUser } = useAuthStore();

  const activeMessages = selectedGroup ? groupMessages : messages;
  const activeLoading = selectedGroup ? isGroupMessagesLoading : isMessagesLoading;

  const messagesContainerRef = useRef(null);
  const isFirstLoadRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const openedSearchContextRef = useRef(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessagesBelow, setHasNewMessagesBelow] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardTargets, setForwardTargets] = useState([]);
  const [imageLightbox, setImageLightbox] = useState(null);

  // Scroll helper
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
      setHasNewMessagesBelow(false);
      setIsAtBottom(true);
    }
  }, []);

  // Monitor scroll position
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceToBottom < 100;
    setIsAtBottom(nearBottom);
    if (nearBottom) {
      setHasNewMessagesBelow(false);
    }
  }, []);

  // Fetch messages & subscribe socket
  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
    } else if (selectedUser) {
      if (navigationTargetMessageId) {
        openedSearchContextRef.current = navigationTargetMessageId;
        getMessageContext(navigationTargetMessageId);
      } else if (openedSearchContextRef.current) {
        openedSearchContextRef.current = null;
      } else getMessages(selectedUser._id);
    }
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id, selectedGroup?._id, navigationTargetMessageId, getMessages, getGroupMessages, getMessageContext, subscribeToMessages, unsubscribeFromMessages]);

  // Reset scroll flags on user change
  useEffect(() => {
    isFirstLoadRef.current = true;
    prevMessagesLengthRef.current = 0;
    setHasNewMessagesBelow(false);
    setIsAtBottom(true);
  }, [selectedUser._id]);

  // Smart auto-scroll effect
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    if (isFirstLoadRef.current) {
      // First load for conversation -> jump to bottom immediately
      scrollToBottom("auto");
      isFirstLoadRef.current = false;
      prevMessagesLengthRef.current = messages.length;
      return;
    }

    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    // isOwnMessage: check by senderId OR by clientMessageId optimistic message
    const isOwnMessage =
      lastMessage?.senderId === authUser._id ||
      lastMessage?.senderId?.toString() === authUser._id?.toString();

    if (isNewMessage) {
      if (isAtBottom || isOwnMessage) {
        scrollToBottom("smooth");
      } else {
        setHasNewMessagesBelow(true);
      }
    } else if (isAtBottom) {
      scrollToBottom("smooth");
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, authUser._id, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (!navigationTargetMessageId || !messages.length) return;
    const element = messagesContainerRef.current?.querySelector(`[data-message-id="${navigationTargetMessageId}"]`);
    if (element) { element.scrollIntoView({ block: "center", behavior: "smooth" }); clearNavigationTarget(); }
  }, [navigationTargetMessageId, messages, clearNavigationTarget]);

  const pinnedMessages = messages.filter((m) => m.isPinned);

  const filteredMessages = conversationSearchQuery
    ? messages.filter((m) =>
        m.text?.toLowerCase().includes(conversationSearchQuery.toLowerCase())
      )
    : messages;

  const handleEditSubmit = async () => {
    if (!editText.trim() || !editingMessage) return;
    await editMessage(editingMessage._id, editText);
    setEditingMessage(null);
    setEditText("");
  };

  if (activeLoading) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-base-100">
      {/* Fixed Header */}
      <div className="flex-shrink-0 z-20 bg-base-100 border-b border-base-300">
        <ChatHeader />
      </div>

      {/* Pinned Banner */}
      {pinnedMessages.length > 0 && (
        <div className="flex-shrink-0 z-10 px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2 text-sm">
          <Pin className="size-3.5 text-primary flex-shrink-0" />
          <span className="text-primary font-medium flex-1 truncate text-xs sm:text-sm">
            {pinnedMessages[pinnedMessages.length - 1].text || "📎 Pinned message"}
          </span>
          <span className="text-[11px] text-base-content/50 flex-shrink-0">{pinnedMessages.length} pinned</span>
        </div>
      )}

      {/* Inline Edit Bar */}
      {editingMessage && (
        <div className="flex-shrink-0 z-10 px-4 py-2 bg-warning/10 border-b border-warning/30 flex items-center gap-2">
          <Pencil className="size-4 text-warning flex-shrink-0" />
          <input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEditSubmit()}
            className="flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
          <button onClick={handleEditSubmit} className="btn btn-xs btn-warning">Save</button>
          <button onClick={() => setEditingMessage(null)} className="btn btn-ghost btn-xs btn-circle">
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* ONLY THIS MESSAGES CONTAINER SCROLLS */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0 messages-scrollbar px-3 sm:px-4 py-3 space-y-3"
      >
        {activeMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm text-base-content/50">No messages yet. Send a message to start chatting!</p>
          </div>
        ) : (
          activeMessages.map((message) => (
            <MessageBubble
              key={message._id || message.clientMessageId}
              message={message}
              isOwn={
                message.senderId === authUser._id ||
                message.senderId?._id === authUser._id ||
                message.senderId?.toString() === authUser._id?.toString()
              }
              authUser={authUser}
              selectedUser={selectedUser}
              conversationSearchQuery={conversationSearchQuery}
              onReply={(msg) => setReplyToMessage(msg)}
              onEdit={(msg) => { setEditingMessage(msg); setEditText(msg.text || ""); }}
              onDelete={(id) => deleteMessage(id)}
              onReact={(id, emoji) => reactToMessage(id, emoji)}
              onPin={(id) => togglePinMessage(id)}
              onStar={(id) => toggleStarMessage(id)}
              onForward={(message) => { setForwardingMessage(message); setForwardTargets([]); }}
              onRetry={(msg) => msg.forwardPayload ? retryForwardMessage(msg) : retrySendMessage(msg)}
              onOpenImage={(gallery, index) => setImageLightbox({ gallery, index })}
              isTarget={navigationTargetMessageId === message._id}
            />
          ))
        )}
      </div>

      {/* Floating "New Messages" / "Scroll to bottom" button */}
      {(!isAtBottom || hasNewMessagesBelow) && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className={`absolute bottom-16 sm:bottom-20 right-4 z-30 btn btn-circle btn-primary btn-sm shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 ${
            hasNewMessagesBelow ? "ring-2 ring-primary ring-offset-2 animate-bounce" : ""
          }`}
          title="Scroll to bottom"
          aria-label="Scroll to latest message"
        >
          <ArrowDown className="size-4" />
          {hasNewMessagesBelow && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
            </span>
          )}
        </button>
      )}

      {/* Fixed Message Composer */}
      <div className="flex-shrink-0 z-20 bg-base-100">
        <MessageInput />
      </div>

      {forwardingMessage && (
        <div className="absolute inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3" onClick={() => setForwardingMessage(null)}>
          <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[75%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-base-300 flex items-center justify-between"><div><p className="font-semibold">Forward message</p><p className="text-xs text-base-content/55 truncate max-w-[280px]">{forwardingMessage.text || "Attachment"}</p></div><button className="btn btn-ghost btn-sm btn-circle" onClick={() => setForwardingMessage(null)}><X className="size-4" /></button></div>
            <div className="overflow-y-auto p-2 flex-1">
              {users.filter((user) => String(user._id) !== String(authUser._id)).map((user) => {
                const checked = forwardTargets.includes(user._id);
                return <label key={user._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-base-200 cursor-pointer"><input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={checked} onChange={() => setForwardTargets((current) => checked ? current.filter((id) => id !== user._id) : [...current, user._id])} /><img src={user.profilePic || "/avatar.png"} className="size-9 rounded-full object-cover" /><span className="text-sm">{user.fullName}</span></label>;
              })}
            </div>
            <div className="p-3 border-t border-base-300 flex justify-end gap-2"><button className="btn btn-ghost btn-sm" onClick={() => setForwardingMessage(null)}>Cancel</button><button disabled={!forwardTargets.length} className="btn btn-primary btn-sm" onClick={async () => { try { await forwardMessage(forwardingMessage, forwardTargets); setForwardingMessage(null); } catch { /* toast is raised by the store */ } }}>Forward{forwardTargets.length ? ` (${forwardTargets.length})` : ""}</button></div>
          </div>
        </div>
      )}
      {imageLightbox && <ImageLightbox gallery={imageLightbox.gallery} index={imageLightbox.index} onClose={() => setImageLightbox(null)} />}
      <GroupSettingsModal />
    </div>
  );
};

export default ChatContainer;
