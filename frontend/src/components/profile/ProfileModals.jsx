import { useState, useRef } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import {
  X, QrCode, Copy, Check, Laptop, Ban, Key, AlertTriangle,
  Shield, Eye, EyeOff, Loader2, RefreshCw, Phone, Smartphone,
  Monitor, Trash2, LogOut
} from "lucide-react";
import toast from "react-hot-toast";

const ProfileModals = () => {
  const { authUser, updateProfile } = useAuthStore();
  const {
    activeModal, closeModal,
    activeSessions, fetchActiveSessions, terminateSession, terminateOtherSessions, isLoadingSessions,
    blockedUsers, fetchBlockedUsers, unblockUser, isLoadingBlocked,
    privacy,
    changePassword,
    deleteAccount,
    setup2FA, verify2FA, disable2FA, twoFactorSetupData, isSetup2FA,
    sharedMedia, fetchSharedMedia, isLoadingMedia,
  } = useProfileStore();

  const profile = authUser?.profile || {};
  const username = profile.username || authUser?.username || "";

  // ─── Form states
  const [fullName, setFullName] = useState(authUser?.fullName || "");
  const [uname, setUname] = useState(username);
  const [bio, setBio] = useState(profile.bio || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [location, setLocation] = useState(profile.location || "");
  const [dob, setDob] = useState(profile.dob || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [statusMessage, setStatusMessage] = useState(profile.statusMessage || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [totpInput, setTotpInput] = useState("");
  const [disablePw, setDisablePw] = useState("");
  const [recoveryKeys, setRecoveryKeys] = useState(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [mediaTab, setMediaTab] = useState("photos");

  const is2FAEnabled = authUser?.twoFactor?.enabled;

  if (!activeModal) return null;

  // ─── On modal open side-effects
  const handleModalOpen = () => {
    if (activeModal === "sessionsModal" && activeSessions.length === 0) fetchActiveSessions();
    if (activeModal === "blockedModal" && blockedUsers.length === 0) fetchBlockedUsers();
    if (activeModal === "mediaGallery") fetchSharedMedia(mediaTab, 1);
  };

  // Trigger side-effects on first render of each modal
  if (activeModal === "sessionsModal" && activeSessions.length === 0) {
    fetchActiveSessions();
  }
  if (activeModal === "blockedModal" && blockedUsers.length === 0) {
    fetchBlockedUsers();
  }

  // ─── Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateProfile({ fullName, username: uname, bio, phone, location, dob, gender, statusMessage });
    closeModal();
  };

  // ─── Change Password
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setIsChangingPw(true);
    const ok = await changePassword(currentPassword, newPassword);
    setIsChangingPw(false);
    if (ok) { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); closeModal(); }
  };

  // ─── Delete Account
  const handleDeleteAccount = async () => {
    if (!deletePassword) { toast.error("Enter your password to confirm"); return; }
    setIsDeleting(true);
    const ok = await deleteAccount(deletePassword);
    setIsDeleting(false);
    if (ok) closeModal();
  };

  // ─── 2FA: setup
  const handleSetup2FA = async () => {
    await setup2FA();
  };

  // ─── 2FA: verify & enable
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    const data = await verify2FA(totpInput);
    if (data?.recoveryKeys) {
      setRecoveryKeys(data.recoveryKeys);
    }
  };

  // ─── 2FA: disable
  const handleDisable2FA = async (e) => {
    e.preventDefault();
    const ok = await disable2FA(disablePw);
    if (ok) { setDisablePw(""); closeModal(); }
  };

  // ─── QR Code copy link
  const handleCopyProfileLink = () => {
    const link = `${window.location.origin}/u/${username || "user"}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Profile link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ─── Download QR
  const handleDownloadQR = () => {
    if (!twoFactorSetupData?.qrCode) {
      toast.error("No QR code available");
      return;
    }
    const a = document.createElement("a");
    a.href = twoFactorSetupData.qrCode;
    a.download = `chatty-profile-qr-${username || "user"}.png`;
    a.click();
  };

  // ─── Session device icon
  const DeviceIcon = ({ device }) => {
    if (/mobile|phone|ios|android/i.test(device)) return <Smartphone className="w-4 h-4" />;
    if (/tablet|ipad/i.test(device)) return <Monitor className="w-4 h-4" />;
    return <Laptop className="w-4 h-4" />;
  };

  const formatLastActive = (date) => {
    if (!date) return "Unknown";
    const diff = (Date.now() - new Date(date)) / 1000;
    if (diff < 60) return "Active now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return new Date(date).toLocaleDateString();
  };

  const modalTitle = {
    editProfile: "Edit Personal Profile",
    qrCode: "Share Profile & QR Code",
    sessionsModal: "Active Login Sessions",
    blockedModal: "Blocked Contacts",
    changePassword: "Change Password",
    twoFactorModal: "Two-Factor Authentication",
    mediaGallery: "Shared Media Gallery",
    deleteAccount: "Delete Account",
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="Preview" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-base-100 border border-base-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto messages-scrollbar">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-base-300">
            <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
              {modalTitle[activeModal] || activeModal}
            </h3>
            <button onClick={closeModal} className="p-2 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. Edit Profile */}
          {activeModal === "editProfile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold mb-1">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="input input-bordered w-full rounded-xl" required />
              </div>
              <div>
                <label className="block font-semibold mb-1">Username Tag</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-base-content/50 font-bold">@</span>
                  <input type="text" value={uname} onChange={(e) => setUname(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    className="input input-bordered w-full pl-8 rounded-xl" placeholder="username" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Bio / About</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                  className="textarea textarea-bordered w-full rounded-xl h-20" placeholder="Tell the world about yourself..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="input input-bordered w-full rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Location</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input input-bordered w-full rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Status Message</label>
                  <input type="text" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} className="input input-bordered w-full rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date of Birth</label>
                  <input type="text" placeholder="YYYY-MM-DD" value={dob} onChange={(e) => setDob(e.target.value)} className="input input-bordered w-full rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="select select-bordered w-full rounded-xl">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="btn btn-sm btn-ghost rounded-xl">Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary rounded-xl px-5">Save Changes</button>
              </div>
            </form>
          )}

          {/* 2. QR Code */}
          {activeModal === "qrCode" && (
            <div className="flex flex-col items-center space-y-4 text-center py-2">
              <div className="p-4 bg-white rounded-2xl border-4 border-primary/20 shadow-lg">
                <div className="w-48 h-48 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-3 text-white space-y-2">
                  <QrCode className="w-32 h-32 text-primary" />
                  <span className="text-[10px] tracking-widest uppercase font-mono text-zinc-400">
                    @{username || "user"}
                  </span>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-base">{authUser?.fullName}</h4>
                <p className="text-xs text-base-content/60">Scan with camera to start a chat on Chatty</p>
                <p className="text-[10px] text-base-content/40 mt-1 font-mono break-all">
                  {window.location.origin}/u/{username || "user"}
                </p>
              </div>
              <div className="flex gap-2 w-full pt-2">
                <button onClick={handleCopyProfileLink} className="btn btn-sm btn-outline btn-primary flex-1 rounded-xl gap-2">
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? "Copied!" : "Copy Link"}
                </button>
                <button onClick={handleDownloadQR} className="btn btn-sm btn-primary flex-1 rounded-xl">
                  Download QR
                </button>
              </div>
            </div>
          )}

          {/* 3. Active Sessions */}
          {activeModal === "sessionsModal" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-base-content/60">Devices currently logged in:</p>
                <button onClick={fetchActiveSessions} className="btn btn-xs btn-ghost gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {isLoadingSessions ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
              ) : activeSessions.length === 0 ? (
                <p className="text-xs text-center text-base-content/60 py-6">No active sessions found.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto messages-scrollbar">
                  {activeSessions.map((session) => (
                    <div key={session._id} className="flex items-center justify-between p-3 bg-base-200/60 rounded-xl border border-base-300">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${session.isCurrent ? "bg-emerald-500/10 text-emerald-500" : "bg-base-100 text-info"}`}>
                          <DeviceIcon device={session.device} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-base-content flex items-center gap-1.5 flex-wrap">
                            {session.browser} on {session.os}
                            {session.isCurrent && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-semibold">THIS DEVICE</span>
                            )}
                          </p>
                          <p className="text-[10px] text-base-content/60">
                            IP: {session.ip} • {formatLastActive(session.lastActive)}
                          </p>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <button onClick={() => terminateSession(session._id)} className="btn btn-xs btn-ghost text-error gap-1">
                          <LogOut className="w-3 h-3" /> Out
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activeSessions.filter((s) => !s.isCurrent).length > 0 && (
                <button onClick={terminateOtherSessions} className="btn btn-sm btn-error btn-outline rounded-xl w-full gap-2">
                  <LogOut className="w-4 h-4" /> Log Out All Other Devices
                </button>
              )}
            </div>
          )}

          {/* 4. Blocked Users */}
          {activeModal === "blockedModal" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-base-content/60">Contacts you have blocked:</p>
                <button onClick={fetchBlockedUsers} className="btn btn-xs btn-ghost gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
              {isLoadingBlocked ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
              ) : blockedUsers.length === 0 ? (
                <p className="text-xs text-base-content/60 text-center py-6">No blocked contacts.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto messages-scrollbar">
                  {blockedUsers.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-base-200/60 rounded-xl border border-base-300">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-base-content">{user.fullName}</p>
                          <p className="text-[10px] text-base-content/60">@{user.username || "—"}</p>
                        </div>
                      </div>
                      <button onClick={() => unblockUser(user._id)} className="btn btn-xs btn-outline btn-success rounded-lg">
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Change Password */}
          {activeModal === "changePassword" && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning font-medium flex gap-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                Changing your password will log out all other active sessions.
              </div>
              <div>
                <label className="block font-semibold mb-1">Current Password</label>
                <div className="relative">
                  <input type={showCurrentPw ? "text" : "password"} value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input input-bordered w-full rounded-xl pr-10" required />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-3 text-base-content/40 hover:text-base-content transition-colors">
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">New Password <span className="text-base-content/50">(min 8 chars)</span></label>
                <div className="relative">
                  <input type={showNewPw ? "text" : "password"} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input input-bordered w-full rounded-xl pr-10" required />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-3 text-base-content/40 hover:text-base-content transition-colors">
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input input-bordered w-full rounded-xl" required />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={closeModal} className="btn btn-sm btn-ghost rounded-xl">Cancel</button>
                <button type="submit" disabled={isChangingPw} className="btn btn-sm btn-primary rounded-xl px-5 gap-2">
                  {isChangingPw && <Loader2 className="w-3 h-3 animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          )}

          {/* 6. Two-Factor Authentication */}
          {activeModal === "twoFactorModal" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-2 gap-3">
                <div className={`p-3 rounded-2xl ${is2FAEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-accent/10 text-accent"} inline-block`}>
                  <Key className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Two-Factor Authentication</h4>
                  <p className="text-xs text-base-content/60 mt-1">
                    {is2FAEnabled ? "2FA is currently active on your account." : "Protect your account with Google Authenticator or Authy."}
                  </p>
                </div>
              </div>

              {/* 2FA Enabled: show disable */}
              {is2FAEnabled && !recoveryKeys && (
                <form onSubmit={handleDisable2FA} className="space-y-3">
                  <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-xs text-success font-medium text-center">
                    ✓ 2FA is active — your account is secured
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Enter password to disable 2FA</label>
                    <input type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)}
                      className="input input-bordered w-full rounded-xl text-sm" required />
                  </div>
                  <button type="submit" className="btn btn-sm btn-error btn-outline w-full rounded-xl">
                    Disable 2FA
                  </button>
                </form>
              )}

              {/* 2FA Not Enabled: show setup */}
              {!is2FAEnabled && !twoFactorSetupData && !recoveryKeys && (
                <button onClick={handleSetup2FA} disabled={isSetup2FA}
                  className="btn btn-primary w-full rounded-xl gap-2">
                  {isSetup2FA && <Loader2 className="w-4 h-4 animate-spin" />}
                  Setup Two-Factor Authentication
                </button>
              )}

              {/* QR Code setup step */}
              {!is2FAEnabled && twoFactorSetupData && !recoveryKeys && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-base-200/60 border border-base-300 text-xs text-base-content/70 text-center">
                    Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>, then enter the 6-digit code to activate.
                  </div>
                  <div className="flex justify-center">
                    <img src={twoFactorSetupData.qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-xl border border-base-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-base-content/50">Or enter secret manually:</p>
                    <p className="font-mono text-xs bg-base-200 rounded-lg px-3 py-1.5 mt-1 break-all">{twoFactorSetupData.secret}</p>
                  </div>
                  <form onSubmit={handleVerify2FA} className="space-y-3">
                    <input type="text" value={totpInput} onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ""))}
                      maxLength={6} placeholder="Enter 6-digit code"
                      className="input input-bordered w-full rounded-xl text-center text-xl tracking-widest font-mono" required />
                    <button type="submit" className="btn btn-primary w-full rounded-xl">Verify & Enable 2FA</button>
                  </form>
                </div>
              )}

              {/* Recovery Keys */}
              {recoveryKeys && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 text-xs text-warning font-medium">
                    ⚠️ Save these recovery keys securely. They can only be shown once.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryKeys.map((key, i) => (
                      <div key={i} className="bg-base-200 rounded-lg px-2 py-1.5 font-mono text-xs text-center text-base-content/80">
                        {key}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setRecoveryKeys(null); closeModal(); }} className="btn btn-primary w-full rounded-xl">
                    I've Saved My Recovery Keys
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 7. Media Gallery */}
          {activeModal === "mediaGallery" && (
            <div className="space-y-3">
              {/* Tab pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 messages-scrollbar">
                {["photos", "videos", "documents", "voiceNotes", "links"].map((tab) => (
                  <button key={tab} onClick={() => { setMediaTab(tab); fetchSharedMedia(tab, 1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all capitalize ${mediaTab === tab ? "bg-primary text-primary-content" : "bg-base-200/60 text-base-content/70 hover:bg-base-200"}`}>
                    {tab} {sharedMedia?.counts?.[tab] > 0 ? `(${sharedMedia.counts[tab]})` : ""}
                  </button>
                ))}
              </div>

              {isLoadingMedia ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin w-6 h-6 text-primary" /></div>
              ) : sharedMedia.items.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-sm text-base-content/60">No {mediaTab} found in your chats.</p>
                </div>
              ) : (
                <div className={`grid gap-2 max-h-64 overflow-y-auto messages-scrollbar ${mediaTab === "photos" || mediaTab === "videos" ? "grid-cols-3" : "grid-cols-1"}`}>
                  {sharedMedia.items.map((item, i) => {
                    if (mediaTab === "photos" && item.image) {
                      return (
                        <div key={i} onClick={() => setLightboxImg(item.image)}
                          className="relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-base-300 hover:opacity-80 transition-opacity">
                          <img src={item.image} alt="shared" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      );
                    }
                    if (mediaTab === "links" && item.text) {
                      const url = item.text.match(/https?:\/\/[^\s]+/)?.[0];
                      return url ? (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-base-200/60 rounded-xl border border-base-300 hover:bg-base-200 transition-colors text-xs">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 text-base">🔗</div>
                          <p className="truncate text-primary">{url}</p>
                        </a>
                      ) : null;
                    }
                    if (item.file) {
                      return (
                        <a key={i} href={item.file} download target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-base-200/60 rounded-xl border border-base-300 hover:bg-base-200 transition-colors text-xs">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0 text-base">📎</div>
                          <p className="truncate text-base-content/80">
                            {item.fileType || "file"} • {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </a>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {sharedMedia.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button onClick={() => fetchSharedMedia(mediaTab, sharedMedia.page - 1)}
                    disabled={sharedMedia.page <= 1} className="btn btn-xs btn-ghost">Prev</button>
                  <span className="text-xs text-base-content/60">Page {sharedMedia.page} / {sharedMedia.totalPages}</span>
                  <button onClick={() => fetchSharedMedia(mediaTab, sharedMedia.page + 1)}
                    disabled={sharedMedia.page >= sharedMedia.totalPages} className="btn btn-xs btn-ghost">Next</button>
                </div>
              )}
            </div>
          )}

          {/* 8. Delete Account */}
          {activeModal === "deleteAccount" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-2 gap-3">
                <div className="p-3 rounded-2xl bg-error/10 text-error inline-block">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-error">Delete Account Permanently</h4>
                  <p className="text-xs text-base-content/70 mt-1">
                    All your messages, media, profile data, and session history will be permanently deleted. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-error/5 border border-error/20 text-xs text-base-content/70 space-y-1">
                <p>✗ All messages will be deleted</p>
                <p>✗ All media references removed</p>
                <p>✗ All active sessions terminated</p>
                <p>✗ Account cannot be recovered</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-error">Confirm with your password</label>
                <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                  className="input input-bordered border-error/40 w-full rounded-xl" placeholder="Your password" />
              </div>

              <div className="flex gap-2">
                <button onClick={closeModal} className="btn btn-sm btn-ghost flex-1 rounded-xl">Cancel</button>
                <button onClick={handleDeleteAccount} disabled={isDeleting || !deletePassword}
                  className="btn btn-sm btn-error flex-1 rounded-xl text-white font-bold gap-2">
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirm Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfileModals;
