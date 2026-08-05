import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import { Camera, CheckCircle2, Edit2, Sparkles } from "lucide-react";

const ProfileHeader = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const { extraProfile, openModal } = useProfileStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const username = authUser?.profile?.username || authUser?.username || authUser?.fullName?.toLowerCase().replace(/\s+/g, "") || "user";
  const bio = authUser?.profile?.bio || authUser?.bio || "Available";

  return (
    <div className="relative bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      {/* Background ambient gradient glow banner */}
      <div className="h-24 -mx-6 -mt-6 rounded-t-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10 opacity-30" />
      </div>

      {/* Main Avatar & Details */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-14 sm:-mt-12 px-2">
        {/* Avatar with Camera Button */}
        <div className="relative group">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-base-100 ring-4 ring-primary/30 shadow-lg transition-transform duration-300 group-hover:scale-[1.02]">
            <img
              src={selectedImg || authUser?.profilePic || "/avatar.png"}
              alt={authUser?.fullName}
              className="w-full h-full rounded-full object-cover"
            />
            {/* Online Indicator */}
            <div className="absolute bottom-1 right-2 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-base-100 animate-pulse" title="Online" />
          </div>

          {/* Camera Upload Button */}
          <label
            htmlFor="header-avatar-upload"
            className={`
              absolute bottom-0 right-0 sm:right-1
              bg-primary hover:bg-primary-focus text-primary-content
              p-2.5 rounded-full cursor-pointer shadow-md
              transition-all duration-200 hover:scale-110 active:scale-95
              flex items-center justify-center
              ${isUpdatingProfile ? "animate-pulse pointer-events-none opacity-80" : ""}
            `}
            title="Change Profile Photo"
          >
            <Camera className="w-4 h-4" />
            <input
              type="file"
              id="header-avatar-upload"
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUpdatingProfile}
            />
          </label>
        </div>

        {/* User Titles & Status */}
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-base-content">
              {authUser?.fullName}
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20" title="Verified Account">
              <CheckCircle2 className="w-3.5 h-3.5 fill-primary text-base-100" />
              Active Profile
            </span>
          </div>

          <p className="text-sm font-medium text-base-content/60 flex items-center justify-center sm:justify-start gap-1">
            @{username}
            <span className="text-xs text-base-content/40">•</span>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Online
            </span>
          </p>

          <p className="text-xs sm:text-sm text-base-content/80 pt-1 line-clamp-2 max-w-md italic">
            "{bio}"
          </p>
        </div>

        {/* Quick Edit Header Button */}
        <button
          onClick={() => openModal("editProfile")}
          className="btn btn-sm btn-ghost border border-base-300 rounded-xl gap-2 hover:bg-base-200 transition-all self-center sm:self-end mt-2 sm:mt-0"
        >
          <Edit2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">Edit Profile</span>
        </button>
      </div>

      {isUpdatingProfile && (
        <div className="mt-3 text-center text-xs text-primary font-medium animate-pulse flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Updating profile photo...
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
