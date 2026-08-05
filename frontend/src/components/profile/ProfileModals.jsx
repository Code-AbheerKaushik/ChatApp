import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import { X, QrCode, Copy, Check, ShieldAlert, Laptop, Ban, Key, Trash2, Maximize2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const ProfileModals = () => {
  const { authUser, updateProfile } = useAuthStore();
  const {
    activeModal,
    closeModal,
    extraProfile,
    updateExtraProfile,
    activeSessions,
    terminateSession,
    blockedUsers,
    unblockUser,
    privacy,
    updatePrivacy,
  } = useProfileStore();

  // --- Form States for Edit Profile (Pre-filled from MongoDB authUser) ---
  const profile = authUser?.profile || {};
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [username, setUsername] = useState(profile.username || authUser?.username || "");
  const [bio, setBio] = useState(profile.bio || authUser?.bio || "");
  const [phone, setPhone] = useState(profile.phone || authUser?.phone || "");
  const [location, setLocation] = useState(profile.location || authUser?.location || "");
  const [dob, setDob] = useState(profile.dob || authUser?.dob || "");
  const [gender, setGender] = useState(profile.gender || authUser?.gender || "");
  const [statusMessage, setStatusMessage] = useState(profile.statusMessage || authUser?.statusMessage || "");

  // --- Form States for Password Change ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [copiedLink, setCopiedLink] = useState(false);

  if (!activeModal) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile({
        fullName,
        username,
        bio,
        phone,
        location,
        dob,
        gender,
        statusMessage,
      });
      closeModal();
    } catch {
      // Toast error displayed by store
    }
  };

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    toast.success("Password updated successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    closeModal();
  };

  const handleCopyProfileLink = () => {
    const link = `${window.location.origin}/u/${username || "user"}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Profile link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-base-100 border border-base-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto messages-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-300">
          <h3 className="text-lg font-bold text-base-content capitalize flex items-center gap-2">
            {activeModal === "editProfile" && "Edit Personal Profile"}
            {activeModal === "qrCode" && "Share Profile & QR Code"}
            {activeModal === "sessionsModal" && "Active Login Sessions"}
            {activeModal === "blockedModal" && "Blocked Contacts"}
            {activeModal === "changePassword" && "Change Password"}
            {activeModal === "twoFactorModal" && "Two-Factor Security"}
            {activeModal === "mediaGallery" && "Shared Media Gallery"}
            {activeModal === "deleteAccount" && "Delete Account"}
          </h3>
          <button
            onClick={closeModal}
            className="p-2 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Edit Profile Modal */}
        {activeModal === "editProfile" && (
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input input-bordered w-full rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Username Tag</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-base-content/50 font-bold">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  className="input input-bordered w-full pl-8 rounded-xl"
                  placeholder="username"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Bio / About</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="textarea textarea-bordered w-full rounded-xl h-20"
                placeholder="Tell the world about yourself..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input input-bordered w-full rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input input-bordered w-full rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Status Message</label>
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  className="input input-bordered w-full rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Date of Birth</label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="input input-bordered w-full rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="select select-bordered w-full rounded-xl"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="btn btn-sm btn-ghost rounded-xl">
                Cancel
              </button>
              <button type="submit" className="btn btn-sm btn-primary rounded-xl px-5">
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* 2. QR Code & Share Modal */}
        {activeModal === "qrCode" && (
          <div className="flex flex-col items-center space-y-4 text-center py-2">
            <div className="p-4 bg-white rounded-2xl border-4 border-primary/20 shadow-lg">
              <div className="w-48 h-48 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-3 text-white space-y-2">
                <QrCode className="w-32 h-32 text-primary animate-pulse" />
                <span className="text-[10px] tracking-widest uppercase font-mono text-zinc-400">
                  @{username || "user"}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-base">{authUser?.fullName}</h4>
              <p className="text-xs text-base-content/60">Scan with camera to start a chat on Chatty</p>
            </div>

            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={handleCopyProfileLink}
                className="btn btn-sm btn-outline btn-primary flex-1 rounded-xl gap-2"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? "Copied Link!" : "Copy Profile Link"}
              </button>
              <button
                onClick={() => {
                  toast.success("QR Code saved to camera roll");
                }}
                className="btn btn-sm btn-primary flex-1 rounded-xl"
              >
                Download QR
              </button>
            </div>
          </div>
        )}

        {/* 3. Active Sessions Modal */}
        {activeModal === "sessionsModal" && (
          <div className="space-y-3">
            <p className="text-xs text-base-content/60">Devices currently logged into your account:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-base-200/60 rounded-xl border border-base-300">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-base-100 text-info">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-base-content flex items-center gap-1.5">
                        {session.device}
                        {session.isCurrent && (
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-semibold">
                            THIS DEVICE
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-base-content/60">{session.location} • IP: {session.ip}</p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => terminateSession(session.id)}
                      className="btn btn-xs btn-ghost text-error"
                    >
                      Log Out
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Blocked Users Modal */}
        {activeModal === "blockedModal" && (
          <div className="space-y-3">
            {blockedUsers.length === 0 ? (
              <p className="text-xs text-base-content/60 text-center py-4">No blocked contacts.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {blockedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-base-200/60 rounded-xl border border-base-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-base-100 text-error">
                        <Ban className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-base-content">{user.name}</p>
                        <p className="text-[10px] text-base-content/60">{user.email} • Blocked {user.date}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => unblockUser(user.id)}
                      className="btn btn-xs btn-outline btn-success rounded-lg"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Change Password Modal */}
        {activeModal === "changePassword" && (
          <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input input-bordered w-full rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input input-bordered w-full rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input input-bordered w-full rounded-xl"
                required
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button type="button" onClick={closeModal} className="btn btn-sm btn-ghost rounded-xl">
                Cancel
              </button>
              <button type="submit" className="btn btn-sm btn-primary rounded-xl px-5">
                Update Password
              </button>
            </div>
          </form>
        )}

        {/* 6. Two-Factor Authentication Modal */}
        {activeModal === "twoFactorModal" && (
          <div className="space-y-4 text-center py-2">
            <div className="p-3 rounded-2xl bg-accent/10 text-accent inline-block">
              <Key className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base">Two-Factor Authentication</h4>
              <p className="text-xs text-base-content/60 mt-1">
                Protect your account with Google Authenticator or Authy.
              </p>
            </div>
            <div className="flex items-center justify-between p-4 bg-base-200/60 rounded-xl border border-base-300 text-left">
              <div>
                <p className="text-xs font-bold text-base-content">2FA Protection</p>
                <p className="text-[11px] text-base-content/60">Require verification code on new device sign in</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-accent toggle-sm"
                checked={privacy.twoFactorEnabled}
                onChange={(e) => updatePrivacy("twoFactorEnabled", e.target.checked)}
              />
            </div>
          </div>
        )}

        {/* 7. Media Gallery Modal */}
        {activeModal === "mediaGallery" && (
          <div className="space-y-3">
            <p className="text-xs text-base-content/60">Full Media Catalog:</p>
            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
              {[
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80",
              ].map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-base-300">
                  <img src={src} alt="Media item" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Delete Account Modal */}
        {activeModal === "deleteAccount" && (
          <div className="space-y-4 text-center py-2">
            <div className="p-3 rounded-2xl bg-error/10 text-error inline-block">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-base text-error">Delete Account Confirmation</h4>
              <p className="text-xs text-base-content/70 mt-1">
                Are you sure you want to permanently delete your account? All messages, media, and settings will be permanently destroyed.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={closeModal} className="btn btn-sm btn-ghost flex-1 rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.error("Account deletion requested. Please contact support.");
                  closeModal();
                }}
                className="btn btn-sm btn-error flex-1 rounded-xl text-white font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModals;
