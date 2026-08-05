import { useEffect } from "react";
import { useProfileStore } from "../../store/useProfileStore";
import { useAuthStore } from "../../store/useAuthStore";
import { MessageSquare, Users, Send, Image, PhoneCall, Clock, Loader2 } from "lucide-react";

const StatsSection = () => {
  const { profileStats, fetchProfileStats, isLoadingStats } = useProfileStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const stats = [
    { label: "Active Chats", value: profileStats.activeChats, icon: MessageSquare, color: "text-primary bg-primary/10" },
    { label: "Group Rooms", value: profileStats.groupRooms, icon: Users, color: "text-secondary bg-secondary/10" },
    { label: "Messages Sent", value: profileStats.messagesSent.toLocaleString(), icon: Send, color: "text-accent bg-accent/10" },
    { label: "Media Shared", value: profileStats.mediaShared, icon: Image, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Calls Made", value: profileStats.callsMade, icon: PhoneCall, color: "text-info bg-info/10" },
    { label: "Account Age", value: `${profileStats.accountAgeDays}d`, icon: Clock, color: "text-warning bg-warning/10" },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider px-1">
          Activity & Metrics
        </h3>
        {isLoadingStats && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-3 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-300/60 transition-all flex items-center gap-3"
            >
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-base-content leading-none">
                  {isLoadingStats ? <span className="loading loading-dots loading-xs" /> : stat.value}
                </p>
                <p className="text-[10px] font-medium text-base-content/60 mt-1 truncate">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsSection;
