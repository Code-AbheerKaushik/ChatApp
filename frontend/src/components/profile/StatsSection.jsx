import { useChatStore } from "../../store/useChatStore";
import { useAuthStore } from "../../store/useAuthStore";
import { MessageSquare, Users, Send, Image, PhoneCall, Clock } from "lucide-react";

const StatsSection = () => {
  const { users } = useChatStore();
  const { authUser } = useAuthStore();

  const accountAgeDays = authUser?.createdAt
    ? Math.max(1, Math.floor((new Date() - new Date(authUser.createdAt)) / (1000 * 60 * 60 * 24)))
    : 1;

  const stats = [
    { label: "Active Chats", value: users.length || 12, icon: MessageSquare, color: "text-primary bg-primary/10" },
    { label: "Group Rooms", value: 3, icon: Users, color: "text-secondary bg-secondary/10" },
    { label: "Messages Sent", value: "1,420+", icon: Send, color: "text-accent bg-accent/10" },
    { label: "Media Shared", value: 94, icon: Image, color: "text-emerald-500 bg-emerald-500/10" },
    { label: "Calls Made", value: 28, icon: PhoneCall, color: "text-info bg-info/10" },
    { label: "Account Age", value: `${accountAgeDays}d`, icon: Clock, color: "text-warning bg-warning/10" },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-3">
      <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wider px-1">
        Activity & Metrics
      </h3>

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
                <p className="text-base font-bold text-base-content leading-none">{stat.value}</p>
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
