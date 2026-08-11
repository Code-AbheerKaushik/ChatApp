import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import { useChatStore } from "../../store/useChatStore";
import { Star, MessageSquare, Loader2, ChevronDown, ArrowRight, Trash2 } from "lucide-react";

const SavedMessagesSection = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { openMessageResult, toggleStarMessage } = useChatStore();
  const navigate = useNavigate();

  const fetchSaved = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/messages/starred", {
        params: { page: pageNum, limit: 20 },
      });
      setMessages((prev) =>
        pageNum === 1 ? res.data.results : [...prev, ...res.data.results]
      );
      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch {
      // silent — store already handles errors globally
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved(1);
  }, [fetchSaved]);

  const handleNavigate = (msg) => {
    openMessageResult(msg);
    navigate("/");
  };

  const handleUnstar = async (e, msg) => {
    e.stopPropagation();
    await toggleStarMessage(msg._id);
    setMessages((prev) => prev.filter((m) => m._id !== msg._id));
  };

  return (
    <div className="card bg-base-100 border border-base-300 rounded-2xl shadow-sm">
      <div className="card-body p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="size-5 text-yellow-500" fill="currentColor" />
            <h2 className="text-base font-semibold">Saved Messages</h2>
          </div>
          {messages.length > 0 && (
            <span className="badge badge-neutral badge-sm">{messages.length}{hasMore ? "+" : ""}</span>
          )}
        </div>

        {/* Loading state */}
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="p-4 rounded-full bg-base-200">
              <Star className="size-8 text-base-content/20" />
            </div>
            <div>
              <p className="text-sm font-medium text-base-content/60">No saved messages yet</p>
              <p className="text-xs text-base-content/40 mt-0.5">
                Tap ⋮ on any message and press Star to save it here
              </p>
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.length > 0 && (
          <div className="space-y-2">
            {messages.map((msg) => {
              const senderName = msg.senderId?.fullName || "Unknown";
              const receiverName = msg.receiverId?.fullName || "Unknown";
              const preview = msg.text || "📎 Attachment";
              const timestamp = new Date(msg.createdAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={msg._id}
                  className="group flex items-start gap-3 p-3 rounded-xl border border-base-200 hover:bg-base-200/60 transition-colors cursor-pointer"
                  onClick={() => handleNavigate(msg)}
                >
                  {/* Icon */}
                  <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
                    <MessageSquare className="size-3.5 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-base-content/50 mb-0.5">
                      {senderName}
                      <ArrowRight className="size-2.5 inline mx-1" />
                      {receiverName}
                    </p>
                    <p className="text-sm text-base-content truncate">{preview}</p>
                    <p className="text-[10px] text-base-content/40 mt-0.5">{timestamp}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleUnstar(e, msg)}
                      className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-error"
                      title="Remove from saved"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleNavigate(msg)}
                      className="btn btn-ghost btn-xs btn-circle text-primary"
                      title="Go to message"
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={() => fetchSaved(page + 1)}
                disabled={loading}
                className="btn btn-ghost btn-sm w-full mt-2 gap-2"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedMessagesSection;
