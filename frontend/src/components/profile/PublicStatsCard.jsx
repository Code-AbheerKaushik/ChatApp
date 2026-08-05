import { Send, Image, Clock, BarChart2 } from "lucide-react";

const PublicStatsCard = ({ user }) => {
  if (!user) return null;

  const stats = user.stats || {};

  const items = [
    {
      label: "Messages Sent",
      value: stats.messagesSent ?? "—",
      icon: Send,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Media Shared",
      value: stats.mediaShared ?? "—",
      icon: Image,
      color: "text-secondary bg-secondary/10",
    },
    {
      label: "Member Since",
      value: stats.accountAgeDays ? `${stats.accountAgeDays} days` : "—",
      icon: Clock,
      color: "text-accent bg-accent/10",
    },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-accent/10 text-accent">
          <BarChart2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-base-content">Activity Overview</h3>
          <p className="text-xs text-base-content/60">Public profile statistics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="p-3 rounded-xl bg-base-200/50 border border-base-300/60 flex items-center gap-3 hover:bg-base-200 transition-all"
          >
            <div className={`p-2 rounded-lg ${color} shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-base-content leading-none">{value}</p>
              <p className="text-[10px] font-medium text-base-content/60 mt-1 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {user.createdAt && (
        <p className="text-[10px] text-base-content/40 text-center pt-1">
          Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );
};

export default PublicStatsCard;
