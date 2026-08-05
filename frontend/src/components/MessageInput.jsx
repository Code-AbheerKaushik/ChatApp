import { useRef, useState, useCallback, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import {
  Send, X, Paperclip, Mic, MicOff, SmilePlus,
  Image as ImageIcon, FileText, Reply
} from "lucide-react";
import toast from "react-hot-toast";

const EMOJI_LIST = [
  "😀","😂","🥰","😍","😎","😭","😤","🥳","😴","🤔",
  "👍","👎","❤️","🔥","💯","✅","🎉","🙏","🤝","💪",
  "😮","😢","😡","🤣","😅","🤗","🤩","😬","😱","🤯",
  "🌹","🌟","🏆","🎯","💡","🚀","⚡","🌈","💎","🍕",
];

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [fileType, setFileType] = useState(null);
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

  const {
    sendMessage,
    replyToMessage, clearReplyToMessage,
    emitTyping, emitStopTyping,
  } = useChatStore();

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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
    setAttachMenuOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const type = file.type.startsWith("video/") ? "video" : "document";
    const reader = new FileReader();
    reader.onloadend = () => {
      setFileData(reader.result);
      setFilePreview(file.name);
      setFileType(type);
    };
    reader.readAsDataURL(file);
    setAttachMenuOpen(false);
  };

  const removeImage = () => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const removeFile = () => { setFileData(null); setFilePreview(null); setFileType(null); if (docInputRef.current) docInputRef.current.value = ""; };
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
    if (!text.trim() && !imagePreview && !fileData && !audioBlob) return;

    emitStopTyping();

    try {
      let audioBase64 = null;
      if (audioBlob) {
        audioBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(audioBlob);
        });
      }

      await sendMessage({
        text: text.trim(),
        image: imagePreview || undefined,
        file: fileData || audioBase64 || undefined,
        fileType: audioBlob ? "audio" : fileType || undefined,
        replyTo: replyToMessage?._id || undefined,
      });

      setText("");
      setImagePreview(null);
      setFileData(null);
      setFilePreview(null);
      setFileType(null);
      setAudioBlob(null);
      clearReplyToMessage();
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (docInputRef.current) docInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
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
      {(imagePreview || filePreview || audioBlob) && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-base-300">
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-base-300" />
              <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 btn btn-xs btn-circle bg-base-100 border border-base-300">
                <X className="size-2.5" />
              </button>
            </div>
          )}
          {filePreview && (
            <div className="relative flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2">
              <FileText className="size-5 text-primary flex-shrink-0" />
              <span className="text-xs max-w-[100px] truncate">{filePreview}</span>
              <button onClick={removeFile} className="btn btn-ghost btn-xs btn-circle">
                <X className="size-2.5" />
              </button>
            </div>
          )}
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
        <div className="px-4 py-3 border-b border-base-300 grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { setText((t) => t + emoji); textareaRef.current?.focus(); }}
              className="text-xl hover:scale-125 transition-transform text-center py-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-end gap-2 p-3 sm:p-4">
        {/* Hidden file inputs */}
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
        <input type="file" accept="video/*,.pdf,.doc,.docx,.txt,.zip" className="hidden" ref={docInputRef} onChange={handleFileChange} />

        {/* Attach Button */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => { setAttachMenuOpen(!attachMenuOpen); setEmojiOpen(false); }}
            className="btn btn-ghost btn-sm btn-circle"
            title="Attachments"
          >
            <Paperclip className="size-4" />
          </button>
          {attachMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 bg-base-100 border border-base-300 rounded-xl shadow-lg overflow-hidden w-36">
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
          onFocus={() => { window.scrollTo(0, 0); document.body.scrollTop = 0; }}
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

        {/* Send Button */}
        <button
          type="submit"
          onClick={handleSendMessage}
          disabled={!text.trim() && !imagePreview && !fileData && !audioBlob}
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
