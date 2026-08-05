import { ArrowLeft, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back button on mobile */}
          <button
            onClick={() => setSelectedUser(null)}
            className="md:hidden btn btn-ghost btn-sm btn-circle"
            aria-label="Back to contacts list"
          >
            <ArrowLeft className="w-5 h-5 text-base-content" />
          </button>

          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium text-sm sm:text-base truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
              {selectedUser.fullName}
            </h3>
            <p className="text-xs text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Close button (desktop only) */}
        <button onClick={() => setSelectedUser(null)} className="hidden md:block">
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
