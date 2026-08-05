import { useProfileStore } from "../../store/useProfileStore";
import { Shield, Eye, CheckCheck, Keyboard, Ban, Lock, Key, Laptop, ChevronRight } from "lucide-react";

const PrivacySection = () => {
  const { privacy, updatePrivacy, openModal, blockedUsers, activeSessions } = useProfileStore();

  const visibilityOptions = ["Everyone", "Contacts", "Nobody"];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-base-content">Privacy & Security Controls</h3>
          <p className="text-xs text-base-content/60">Manage who can see your info and activity</p>
        </div>
      </div>

      {/* Visibility Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Last Seen Visibility */}
        <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-300/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-base-content">
            <Eye className="w-4 h-4 text-primary" />
            <span>Last Seen Visibility</span>
          </div>
          <select
            value={privacy.lastSeen}
            onChange={(e) => updatePrivacy("lastSeen", e.target.value)}
            className="select select-sm select-bordered w-full text-xs rounded-lg bg-base-100 focus:outline-none"
          >
            {visibilityOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Profile Photo Visibility */}
        <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-300/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-base-content">
            <Eye className="w-4 h-4 text-secondary" />
            <span>Profile Photo Visibility</span>
          </div>
          <select
            value={privacy.profilePhoto}
            onChange={(e) => updatePrivacy("profilePhoto", e.target.value)}
            className="select select-sm select-bordered w-full text-xs rounded-lg bg-base-100 focus:outline-none"
          >
            {visibilityOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggles (Read Receipts & Typing Indicator) */}
      <div className="divide-y divide-base-200 bg-base-200/40 rounded-xl border border-base-300/60 overflow-hidden">
        <div className="flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors">
          <div className="flex items-center gap-3">
            <CheckCheck className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-xs font-semibold text-base-content">Read Receipts</p>
              <p className="text-[11px] text-base-content/60">If turned off, you won't send or receive Read receipts</p>
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={privacy.readReceipts}
            onChange={(e) => updatePrivacy("readReceipts", e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors">
          <div className="flex items-center gap-3">
            <Keyboard className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-xs font-semibold text-base-content">Typing Indicator</p>
              <p className="text-[11px] text-base-content/60">Show when you are actively typing a message</p>
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={privacy.typingIndicator}
            onChange={(e) => updatePrivacy("typingIndicator", e.target.checked)}
          />
        </div>
      </div>

      {/* Action Buttons to Settings Modals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <button
          onClick={() => openModal("blockedModal")}
          className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-300/60 transition-all group"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-base-content">
            <Ban className="w-4 h-4 text-error" />
            <span>Blocked Users ({blockedUsers.length})</span>
          </div>
          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => openModal("sessionsModal")}
          className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-300/60 transition-all group"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-base-content">
            <Laptop className="w-4 h-4 text-info" />
            <span>Active Sessions ({activeSessions.length})</span>
          </div>
          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => openModal("changePassword")}
          className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-300/60 transition-all group"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-base-content">
            <Lock className="w-4 h-4 text-warning" />
            <span>Change Password</span>
          </div>
          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => openModal("twoFactorModal")}
          className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-300/60 transition-all group"
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold text-base-content">
            <Key className="w-4 h-4 text-accent" />
            <span>Two-Factor Authentication</span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${privacy.twoFactorEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-base-300 text-base-content/60"}`}>
            {privacy.twoFactorEnabled ? "ON" : "OFF"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default PrivacySection;
