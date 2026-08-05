import { useAuthStore } from "../../store/useAuthStore";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { CheckCircle2, Loader2, MapPin, Cake, User, AtSign, Shield, Image } from "lucide-react";

const StepPreview = ({ onComplete }) => {
  const { authUser } = useAuthStore();
  const { draft, isSavingStep } = useOnboardingStore();

  const displayName = draft.displayName || authUser?.fullName || "Your Name";
  const username = draft.username || authUser?.profile?.username || "";
  const bio = draft.bio || authUser?.profile?.bio || "";
  const location = draft.location || authUser?.profile?.location || "";
  const dob = draft.dob || authUser?.profile?.dob || "";
  const gender = draft.gender || authUser?.profile?.gender || "";
  const profilePic = draft.profilePic || authUser?.profilePic || null;
  const photoVis = draft.profilePhotoVisibility || "Everyone";
  const lastSeenVis = draft.lastSeenVisibility || "Everyone";

  const InfoRow = ({ icon: Icon, label, value, color }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-3 py-2 border-b border-base-200 last:border-0">
        <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
        <div className="min-w-0">
          <p className="text-[11px] text-base-content/50 font-medium">{label}</p>
          <p className="text-sm font-semibold text-base-content truncate">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-7 h-7 text-success" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">You're all set!</h2>
        <p className="text-sm text-base-content/60">Here's how your profile will look to others.</p>
      </div>

      {/* Profile Card Preview */}
      <div className="bg-base-200/60 border border-base-300 rounded-2xl p-5 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-base-300 flex-shrink-0 flex items-center justify-center">
            {profilePic ? (
              <img src={profilePic} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {(displayName || "U")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-base-content">{displayName}</h3>
            {username && (
              <p className="text-sm text-base-content/60 font-medium">@{username}</p>
            )}
            {bio && (
              <p className="text-xs text-base-content/70 mt-1 italic line-clamp-2">"{bio}"</p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-0">
          <InfoRow icon={MapPin} label="Location" value={location} color="text-emerald-500" />
          <InfoRow icon={Cake} label="Birthday" value={dob} color="text-error" />
          <InfoRow icon={User} label="Gender" value={gender} color="text-info" />
          <InfoRow icon={Image} label="Profile Photo" value={`Visible to: ${photoVis}`} color="text-primary" />
          <InfoRow icon={Shield} label="Last Seen" value={`Visible to: ${lastSeenVis}`} color="text-warning" />
        </div>
      </div>

      <div className="p-3 rounded-xl bg-success/5 border border-success/20 text-center">
        <p className="text-xs text-base-content/60">
          🎉 Everything saved! You can update any of these details anytime in your <strong>Profile Settings</strong>.
        </p>
      </div>

      {/* Enter App Button */}
      <button
        onClick={onComplete}
        disabled={isSavingStep}
        className="btn btn-primary btn-lg rounded-2xl gap-2 shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all w-full"
      >
        {isSavingStep ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
        Enter Chatty 🚀
      </button>
    </div>
  );
};

export default StepPreview;
