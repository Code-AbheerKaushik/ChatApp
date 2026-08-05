import { useProfileStore } from "../../store/useProfileStore";
import { ShieldAlert, Key, Laptop, History, LogOut, CheckCircle2, ChevronRight } from "lucide-react";

const SecuritySection = () => {
  const { openModal, terminateOtherSessions, activeSessions } = useProfileStore();

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-base-content">Security & Login Management</h3>
          <p className="text-xs text-base-content/60">Keep your account protected across all devices</p>
        </div>
      </div>

      <div className="divide-y divide-base-200 bg-base-200/40 rounded-xl border border-base-300/60 overflow-hidden">
        {/* Change Password */}
        <button
          onClick={() => openModal("changePassword")}
          className="w-full flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-base-100 text-warning">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-base-content">Change Password</p>
              <p className="text-[11px] text-base-content/60">Update your account login password</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Two Factor */}
        <button
          onClick={() => openModal("twoFactorModal")}
          className="w-full flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-base-100 text-accent">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-base-content">Two-Factor Authentication (2FA)</p>
              <p className="text-[11px] text-base-content/60">Add an extra layer of security with authenticator apps</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Active Devices & Sessions */}
        <button
          onClick={() => openModal("sessionsModal")}
          className="w-full flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-base-100 text-info">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-base-content">Active Devices & Login History</p>
              <p className="text-[11px] text-base-content/60">{activeSessions.length} sessions active worldwide</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Login History */}
        <button
          onClick={() => openModal("sessionsModal")}
          className="w-full flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-base-100 text-secondary">
              <History className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-base-content">Trusted Devices & Security Log</p>
              <p className="text-[11px] text-base-content/60">Review login locations and authorized hardware</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Logout from Other Devices Action */}
      <button
        onClick={terminateOtherSessions}
        className="btn btn-sm btn-ghost border border-error/30 text-error hover:bg-error/10 w-full rounded-xl gap-2 text-xs font-semibold"
      >
        <LogOut className="w-4 h-4" />
        Logout From All Other Devices
      </button>
    </div>
  );
};

export default SecuritySection;
