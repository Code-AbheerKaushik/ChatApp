import { ShieldCheck, Lock, Server, CheckCircle2, Info, X } from "lucide-react";

const SecurityIndicatorModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-base-300 pb-3">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <ShieldCheck className="size-5" />
            <span>Connection Security Info</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
            <X className="size-4" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary text-primary-content">
            <Lock className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-base-content">TLS Encrypted in Transit</p>
            <p className="text-[11px] text-base-content/70">Protected by SSL/TLS & JWT Authentication</p>
          </div>
        </div>

        {/* Protection Items */}
        <div className="space-y-2.5 text-xs text-base-content/80">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-success flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-base-content">Transport Security:</span> All chat data, web sockets, and media streams are encrypted in transit over HTTPS/WSS (TLS 1.3).
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-success flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-base-content">Access Control:</span> Strict session token authentication prevents unauthorized API or media access.
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-success flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-base-content">Server Disappearing Messages:</span> Timed messages automatically expire and clear from database storage upon expiration.
            </div>
          </div>
        </div>

        {/* Truthful E2EE Note */}
        <div className="p-3 bg-base-200/80 rounded-2xl border border-base-300 text-[11px] text-base-content/60 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-base-content/80">
            <Info className="size-3.5 text-info" /> Architecture Notice
          </div>
          <p>
            Messages are securely processed and stored on our cloud database with strict user authorization boundaries. End-to-End Encryption (client-side zero-knowledge encryption) is not enabled on this deployment.
          </p>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="btn btn-primary btn-sm w-full rounded-xl mt-2">
          Got it
        </button>
      </div>
    </div>
  );
};

export default SecurityIndicatorModal;
