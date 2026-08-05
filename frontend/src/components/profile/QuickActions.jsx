import { useProfileStore } from "../../store/useProfileStore";
import { useAuthStore } from "../../store/useAuthStore";
import { Edit3, QrCode, Share2, Copy, UserPlus, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const QuickActions = () => {
  const { openModal, extraProfile } = useProfileStore();
  const { authUser } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const username = extraProfile.username || authUser?.fullName?.toLowerCase().replace(/\s+/g, "") || "user";

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${username}`);
    setCopied(true);
    toast.success("Username copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = () => {
    const inviteText = `Join me on Chatty App! Add me @${username}`;
    if (navigator.share) {
      navigator.share({
        title: "Chatty App Invite",
        text: inviteText,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(inviteText);
      toast.success("Invite message copied to clipboard!");
    }
  };

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-4 shadow-sm">
      <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3 px-1">
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          onClick={() => openModal("editProfile")}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-base-200/60 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all group duration-200"
        >
          <div className="p-2.5 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <Edit3 className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-base-content mt-2 group-hover:text-primary">
            Edit Profile
          </span>
        </button>

        <button
          onClick={() => openModal("qrCode")}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-base-200/60 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all group duration-200"
        >
          <div className="p-2.5 rounded-full bg-secondary/10 text-secondary group-hover:scale-110 transition-transform">
            <Share2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-base-content mt-2 group-hover:text-secondary">
            Share Profile
          </span>
        </button>

        <button
          onClick={() => openModal("qrCode")}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-base-200/60 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all group duration-200"
        >
          <div className="p-2.5 rounded-full bg-accent/10 text-accent group-hover:scale-110 transition-transform">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-base-content mt-2 group-hover:text-accent">
            QR Code
          </span>
        </button>

        <button
          onClick={handleCopyUsername}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-base-200/60 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all group duration-200"
        >
          <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </div>
          <span className="text-xs font-medium text-base-content mt-2 group-hover:text-emerald-500">
            {copied ? "Copied!" : "Copy Tag"}
          </span>
        </button>

        <button
          onClick={handleInvite}
          className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3 rounded-xl bg-base-200/60 hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all group duration-200"
        >
          <div className="p-2.5 rounded-full bg-info/10 text-info group-hover:scale-110 transition-transform">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-base-content mt-2 group-hover:text-info">
            Invite Friends
          </span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
