import { useRef, useState, useCallback, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import {
  Send, X, Paperclip, Mic, MicOff, SmilePlus,
  Image as ImageIcon, FileText, Reply
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import toast from "react-hot-toast";


const MessageInput = () => {
  const [text, setText] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const textareaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const draftTimerRef = useRef(null);
  const preserveDraftUntilSendResultRef = useRef(false);
  const isSendingRef = useRef(false); // Prevent double-submit

  const {
    sendMessage,
    replyToMessage, clearReplyToMessage,
    emitTyping, emitStopTyping,
    selectedUser, getDraft, saveDraft,
  } = useChatStore();

  // Cleanup typing timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  // Drafts are local per conversation: they survive navigation and refresh without database writes.
  useEffect(() => {
    if (!selectedUser?._id) return;
    setText(getDraft(selectedUser._id));
    setMediaItems([]); setAudioBlob(null);
  }, [selectedUser?._id, getDraft]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    if (!text && preserveDraftUntilSendResultRef.current) return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => saveDraft(selectedUser._id, text), 350);
    return () => clearTimeout(draftTimerRef.current);
  }, [text, selectedUser?._id, saveDraft]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [text]);

  const handleTyping = useCallback(() => {
    emitTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitStopTyping();
    }, 1500);
  }, [emitTyping, emitStopTyping]);

  const addFiles = async (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (mediaItems.length + selected.length > 10) return toast.error("You can attach up to 10 files");
    const allowed = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm)|audio\/(webm|mpeg|ogg)|application\/pdf|text\/plain)$/;
    const valid = selected.filter((file) => file.size <= 20 * 1024 * 1024 && allowed.test(file.type));
    if (valid.length !== selected.length) toast.error("Unsupported file or file over 20 MB");
    const read = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const items = await Promise.all(valid.map(async (file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, type: file.type, size: file.size, data: await read(file), preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null })));
    setMediaItems((current) => [...current, ...items]); setAttachMenuOpen(false);
  };
  const removeMedia = (id) => setMediaItems((current) => { const item = current.find((candidate) => candidate.id === id); if (item?.preview) URL.revokeObjectURL(item.preview); return current.filter((candidate) => candidate.id !== id); });
  const removeAudio = () => setAudioBlob(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    // Guard: prevent double-submit from rapid clicks or Enter key
    if (isSendingRef.current) return;
    if (!text.trim() && !mediaItems.length && !audioBlob) return;

    isSendingRef.current = true;
    emitStopTyping();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    // Capture current values before clearing
    const currentText = text.trim();
    const currentMedia = mediaItems;
    const currentAudioBlob = audioBlob;
    const currentReplyTo = replyToMessage?._id;

    // ── INSTANT CLEAR ────────────────────────────────────────────
    setText("");
    preserveDraftUntilSendResultRef.current = true;
    setMediaItems([]);
    setAudioBlob(null);
    clearReplyToMessage();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";

    // ── KEEP KEYBOARD OPEN ────────────────────────────────────────
    // Re-focus immediately in the same sync tick so the mobile
    // OS does not dismiss the virtual keyboard.
    textareaRef.current?.focus();

    // Release guard immediately after clearing — allows rapid
    // sequential sends without blocking on the network round-trip.
    // Duplicate prevention is handled by clientMessageId idempotency.
    isSendingRef.current = false;

    try {
      let audioBase64 = null;
      if (currentAudioBlob) {
        audioBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(currentAudioBlob);
        });
      }

      let sent = false;
      if (useGroupStore.getState().selectedGroup) {
        sent = await useGroupStore.getState().sendGroupMessage(
          useGroupStore.getState().selectedGroup._id,
          {
            text: currentText,
            media: [...currentMedia.map(({ name, type, size, data }) => ({ name, type, size, data })), ...(audioBase64 ? [{ name: "Voice message.webm", type: "audio/webm", size: currentAudioBlob.size, data: audioBase64 }] : [])],
            replyTo: currentReplyTo || undefined,
          }
        );
      } else {
        sent = await sendMessage({
          text: currentText,
          media: [...currentMedia.map(({ name, type, size, data }) => ({ name, type, size, data })), ...(audioBase64 ? [{ name: "Voice message.webm", type: "audio/webm", size: currentAudioBlob.size, data: audioBase64 }] : [])],
          replyTo: currentReplyTo || undefined,
        });
      }
      preserveDraftUntilSendResultRef.current = false;
      if (sent) {
        if (selectedUser?._id) saveDraft(selectedUser._id, "");
      } else if (currentText) setText((value) => value || currentText);
    } catch (error) {
      preserveDraftUntilSendResultRef.current = false;
      // sendMessage catches its own errors internally; this is a safety net.
      console.error("Unexpected send error:", error);
    }
  };

  return (
    <div className="border-t border-base-300 bg-base-100 safe-bottom flex-shrink-0">
      {/* Reply Preview */}
      {replyToMessage && (
        <div className="flex items-center gap-3 px-4 py-2 bg-base-200 border-b border-base-300">
          <Reply className="size-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-medium">Replying to message</p>
            <p className="text-xs text-base-content/60 truncate">{replyToMessage.text || "📎 Attachment"}</p>
          </div>
          <button onClick={clearReplyToMessage} className="btn btn-ghost btn-xs btn-circle flex-shrink-0">
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Attachment Previews */}
      {(mediaItems.length > 0 || audioBlob) && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-base-300">
          {mediaItems.map((item) => <div key={item.id} className="relative flex items-center gap-2 bg-base-200 rounded-xl px-2 py-2">{item.preview ? <img src={item.preview} alt={item.name} className="h-16 w-16 object-cover rounded-lg" /> : <FileText className="size-5 text-primary" />}<span className="text-xs max-w-[90px] truncate">{item.name}</span><button onClick={() => removeMedia(item.id)} className="btn btn-ghost btn-xs btn-circle"><X className="size-2.5" /></button></div>)}
          {audioBlob && (
            <div className="relative flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-2">
              <Mic className="size-4 text-primary" />
              <span className="text-xs text-primary">Voice message ready</span>
              <button onClick={removeAudio} className="btn btn-ghost btn-xs btn-circle">
                <X className="size-2.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Emoji Picker */}
      {emojiOpen && (
        <div className="border-b border-base-300">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              setText((t) => t + emojiData.emoji);
              textareaRef.current?.focus();
            }}
            width="100%"
            height={320}
            lazyLoadEmojis
          />
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2 p-3 sm:p-4">
        {/* Hidden file inputs */}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" ref={fileInputRef} onChange={(e) => addFiles(e.target.files)} />
        <input type="file" accept="video/mp4,video/webm,audio/webm,audio/mpeg,audio/ogg,application/pdf,text/plain" multiple className="hidden" ref={docInputRef} onChange={(e) => addFiles(e.target.files)} />

        {/* Attach Button */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => { setAttachMenuOpen(!attachMenuOpen); setEmojiOpen(false); }}
            className={`btn btn-ghost btn-sm btn-circle ${attachMenuOpen ? "btn-active" : ""}`}
            title="Attachments"
          >
            <Paperclip className="size-4" />
          </button>
          {attachMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 bg-base-100/95 backdrop-blur-md border border-base-300 rounded-xl shadow-xl overflow-hidden w-36 z-30 animate-in fade-in slide-in-from-bottom-2">
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-4 text-primary" /> Image
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors"
                onClick={() => docInputRef.current?.click()}
              >
                <FileText className="size-4 text-info" /> File / Video
              </button>
            </div>
          )}
        </div>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => { setEmojiOpen(!emojiOpen); setAttachMenuOpen(false); }}
          className={`btn btn-ghost btn-sm btn-circle flex-shrink-0 ${emojiOpen ? "btn-active" : ""}`}
          title="Emoji"
        >
          <SmilePlus className="size-4" />
        </button>

        {/* Auto-resize Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
          }}
          placeholder="Type a message..."
          className="flex-1 bg-base-200 rounded-2xl px-4 py-2.5 text-sm resize-none outline-none min-h-[2.5rem] max-h-[7.5rem] leading-relaxed"
          style={{ overflowY: "auto" }}
        />

        {/* Voice Record */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`btn btn-sm btn-circle flex-shrink-0 ${isRecording ? "btn-error animate-pulse" : "btn-ghost"}`}
          title={isRecording ? "Stop Recording" : "Record Voice"}
        >
          {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>

        {/* Send Button — onMouseDown preventDefault prevents focus loss on mobile */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSendMessage}
          disabled={!text.trim() && !mediaItems.length && !audioBlob}
          className="btn btn-primary btn-sm btn-circle flex-shrink-0"
          title="Send"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
