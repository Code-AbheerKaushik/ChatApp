import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useProfileStore } from "../../store/useProfileStore";
import {
  MessageSquare, Phone, Video, Share2, Copy, Check, Ban, Flag, Loader2, ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

const PublicProfileActions = ({ user }) => {
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const { setSelectedUser, users } = useChatStore();
  const { fetchPublicProfile } = useProfileStore();
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  if (!user) return null;

  const isBlocked = !!user.isBlocked;

  const handleMessage = () => {
    if (isBlocked) {
      toast.error("Unblock this user to send messages.");
      return;
    }
    const existingUser = users.find((u) => String(u._id) === String(user._id));
    setSelectedUser(
      existingUser || {
        _id: user._id,
        fullName: user.fullName,
        profilePic: user.profilePic,
        username: user.username,
      }
    );
    navigate("/");
  };

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${user.username || user.fullName}`);
    setCopiedUsername(true);
    toast.success("Username copied!");
    setTimeout(() => setCopiedUsername(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/user/${user._id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Profile link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${user._id}`;
    if (navigator.share) {
      await navigator.share({
        title: user.fullName,
        text: `Check out ${user.fullName}'s profile on Chatty!`,
        url,
      });
    } else {
      handleCopyLink();
    }
  };

  const handleBlockToggle = async () => {
    setIsBlocking(true);
    try {
      if (isBlocked) {
        await axiosInstance.post(`/auth/unblock/${user._id}`);
        toast.success(`${user.fullName} has been unblocked.`);
      } else {
        await axiosInstance.post(`/auth/block/${user._id}`);
        toast.success(`${user.fullName} has been blocked.`);
      }
      // Re-fetch the profile to sync the isBlocked state from the server
      await fetchPublicProfile(user._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleReport = () => {
    toast.success("Report submitted. Our team will review it shortly.", { icon: "🚩" });
  };

  const primaryActions = [
    {
      id: "message",
      label: "Message",
      icon: MessageSquare,
      className: `btn btn-sm ${isBlocked ? "btn-disabled opacity-50" : "btn-primary"} rounded-xl gap-2 px-5`,
      onClick: handleMessage,
    },
    {
      id: "voice",
      label: "Voice Call",
      icon: Phone,
      className: `btn btn-sm ${isBlocked ? "btn-disabled opacity-50" : "btn-outline"} rounded-xl gap-2 px-5`,
      onClick: () => {
        if (isBlocked) { toast.error("Unblock this user first."); return; }
        toast("Voice calls coming soon!", { icon: "📞" });
      },
    },
    {
      id: "video",
      label: "Video Call",
      icon: Video,
      className: `btn btn-sm ${isBlocked ? "btn-disabled opacity-50" : "btn-outline"} rounded-xl gap-2 px-5`,
      onClick: () => {
        if (isBlocked) { toast.error("Unblock this user first."); return; }
        toast("Video calls coming soon!", { icon: "📹" });
      },
    },
  ];

  const secondaryActions = [
    {
      id: "share",
      label: "Share",
      icon: Share2,
      danger: false,
      onClick: handleShare,
    },
    {
      id: "copy-username",
      label: copiedUsername ? "Copied!" : "Copy @",
      icon: copiedUsername ? Check : Copy,
      danger: false,
      onClick: handleCopyUsername,
    },
    {
      id: "copy-link",
      label: copiedLink ? "Copied!" : "Copy Link",
      icon: copiedLink ? Check : Copy,
      danger: false,
      onClick: handleCopyLink,
    },
    {
      id: "block",
      label: isBlocking ? "Please wait…" : isBlocked ? "Unblock User" : "Block User",
      icon: isBlocking ? Loader2 : Ban,
      // Unblock = warning style, Block = error/danger style
      className: isBlocked
        ? "btn btn-xs btn-ghost rounded-lg gap-1.5 border border-warning/50 text-warning hover:bg-warning/10"
        : "btn btn-xs btn-ghost rounded-lg gap-1.5 border border-error/40 text-error hover:bg-error/10",
      onClick: handleBlockToggle,
      disabled: isBlocking,
    },
    {
      id: "report",
      label: "Report",
      icon: Flag,
      danger: true,
      onClick: handleReport,
    },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">

      {/* Blocked User Banner */}
      {isBlocked && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            You've blocked <strong>{user.fullName?.split(" ")[0]}</strong>. They can't message you or see your activity.
          </span>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
        {primaryActions.map(({ id, label, icon: Icon, className, onClick }) => (
          <button key={id} onClick={onClick} className={className}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {secondaryActions.map(({ id, label, icon: Icon, onClick, danger, className, disabled }) => (
          <button
            key={id}
            onClick={onClick}
            disabled={disabled}
            className={
              className ||
              `btn btn-xs btn-ghost rounded-lg gap-1.5 border border-base-300 ${
                danger ? "text-error hover:text-error hover:border-error/40" : "text-base-content/70"
              }`
            }
          >
            <Icon className={`w-3.5 h-3.5 ${disabled ? "animate-spin" : ""}`} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PublicProfileActions;
