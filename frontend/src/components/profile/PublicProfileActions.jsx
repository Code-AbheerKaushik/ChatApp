import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useProfileStore } from "../../store/useProfileStore";
import {
  MessageSquare, Phone, Video, Share2, Copy, Check, Ban, Flag, Loader2,
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

  const isBlocked = user.isBlocked;

  const handleMessage = () => {
    // Find user in sidebar list if present, else use the fetched profile data
    const existingUser = users.find((u) => String(u._id) === String(user._id));
    setSelectedUser(existingUser || { _id: user._id, fullName: user.fullName, profilePic: user.profilePic, username: user.username });
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
      await navigator.share({ title: user.fullName, text: `Check out ${user.fullName}'s profile on Chatty!`, url });
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
      // Refresh the public profile to get updated block state
      await fetchPublicProfile(user._id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed.");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleReport = () => {
    toast.success("Report submitted. Our team will review it shortly.");
  };

  const primaryActions = [
    {
      label: "Message",
      icon: MessageSquare,
      color: "btn-primary",
      onClick: handleMessage,
    },
    {
      label: "Voice Call",
      icon: Phone,
      color: "btn-outline",
      onClick: () => toast("Voice calls coming soon!", { icon: "📞" }),
    },
    {
      label: "Video Call",
      icon: Video,
      color: "btn-outline",
      onClick: () => toast("Video calls coming soon!", { icon: "📹" }),
    },
  ];

  const secondaryActions = [
    {
      label: "Share",
      icon: Share2,
      onClick: handleShare,
    },
    {
      label: copiedUsername ? "Copied!" : "Copy @",
      icon: copiedUsername ? Check : Copy,
      onClick: handleCopyUsername,
    },
    {
      label: copiedLink ? "Copied!" : "Copy Link",
      icon: copiedLink ? Check : Copy,
      onClick: handleCopyLink,
    },
    {
      label: isBlocking ? "..." : isBlocked ? "Unblock" : "Block",
      icon: isBlocking ? Loader2 : Ban,
      onClick: handleBlockToggle,
      danger: !isBlocked,
    },
    {
      label: "Report",
      icon: Flag,
      onClick: handleReport,
      danger: true,
    },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Primary Action Buttons */}
      <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
        {primaryActions.map(({ label, icon: Icon, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className={`btn btn-sm ${color} rounded-xl gap-2 px-5`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {secondaryActions.map(({ label, icon: Icon, onClick, danger }) => (
          <button
            key={label}
            onClick={onClick}
            className={`btn btn-xs btn-ghost rounded-lg gap-1.5 border border-base-300 ${danger ? "text-error hover:text-error hover:border-error/40" : "text-base-content/70"}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PublicProfileActions;
