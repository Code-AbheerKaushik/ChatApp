import { useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useChatStore } from "../../store/useChatStore";
import { Archive, Star, Heart, EyeOff, Smartphone, BarChart2, LogOut, Trash2, Ban, ChevronRight } from "lucide-react";

const AccountSection = () => {
  const { logout } = useAuthStore();
  const { openModal, blockedUsers, activeSessions, fetchActiveSessions, fetchBlockedUsers } = useProfileStore();
  const { archivedUsers, favoriteUsers } = useChatStore();

  useEffect(() => {
    fetchBlockedUsers();
    fetchActiveSessions();
  }, []);

  const accountOptions = [
    {
      id: "archive",
      icon: Archive,
      title: "Archive Chats",
      count: archivedUsers?.length || 0,
      color: "text-primary",
    },
    {
      id: "favorites",
      icon: Heart,
      title: "Favorite Contacts",
      count: favoriteUsers?.length || 0,
      color: "text-error",
    },
    {
      id: "starred",
      icon: Star,
      title: "Starred Messages",
      count: 14,
      color: "text-amber-500",
    },
    {
      id: "blocked",
      icon: Ban,
      title: "Blocked Contacts",
      count: blockedUsers?.length || 0,
      color: "text-secondary",
      action: () => openModal("blockedModal"),
    },
    {
      id: "hidden",
      icon: EyeOff,
      title: "Hidden Chats",
      count: 0,
      color: "text-accent",
    },
    {
      id: "linked",
      icon: Smartphone,
      title: "Linked Devices",
      count: activeSessions.length,
      color: "text-info",
      action: () => openModal("sessionsModal"),
    },
    {
      id: "dataUsage",
      icon: BarChart2,
      title: "Network Data Usage",
      subtitle: "1.4 GB sent / 3.8 GB rec",
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-semibold text-base-content">Account Management</h3>
        <p className="text-xs text-base-content/60">Organize messaging archives, devices, and session state</p>
      </div>

      <div className="divide-y divide-base-200 bg-base-200/40 rounded-xl border border-base-300/60 overflow-hidden">
        {accountOptions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.action || (() => {})}
              className="w-full flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg bg-base-100 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-base-content">{item.title}</p>
                  {item.subtitle && <p className="text-[11px] text-base-content/60">{item.subtitle}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {item.count !== undefined && (
                  <span className="text-[11px] font-semibold bg-base-100 px-2 py-0.5 rounded-md border border-base-300">
                    {item.count}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-base-content/40 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Logout & Delete Account Actions */}
      <div className="pt-2 space-y-2">
        <button
          onClick={logout}
          className="btn btn-sm btn-ghost hover:bg-base-200 border border-base-300 w-full rounded-xl gap-2 text-xs font-semibold"
        >
          <LogOut className="w-4 h-4 text-base-content/70" />
          Log Out of Account
        </button>

        {/* Delete Account separately in Red */}
        <div className="pt-2 border-t border-error/20">
          <button
            onClick={() => openModal("deleteAccount")}
            className="btn btn-sm btn-error btn-outline hover:bg-error hover:text-white w-full rounded-xl gap-2 text-xs font-bold"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account Permanently
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSection;
