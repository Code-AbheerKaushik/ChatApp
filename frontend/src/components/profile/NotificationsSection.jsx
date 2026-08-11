import { useState, useEffect } from "react";
import { useProfileStore } from "../../store/useProfileStore";
import { Bell, BellOff, Volume2, Smartphone, Eye, MessageSquare, Users, PhoneCall, Globe, CheckCircle2, AlertCircle } from "lucide-react";
import { subscribeUserToPush, unsubscribeUserFromPush, isPushSupported } from "../../lib/pushManager";
import toast from "react-hot-toast";

const NotificationsSection = () => {
  const { notifications, updateNotification } = useProfileStore();
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (isPushSupported() && Notification.permission === "granted") {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushSubscribed(!!sub);
        });
      });
    }
  }, []);

  const handlePushToggle = async (checked) => {
    setPushLoading(true);
    try {
      if (checked) {
        await subscribeUserToPush();
        setPushSubscribed(true);
        updateNotification("messageNotifications", true);
        toast.success("Browser push notifications enabled!");
      } else {
        await unsubscribeUserFromPush();
        setPushSubscribed(false);
        toast.success("Browser push notifications disabled.");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update push notification settings");
      setPushSubscribed(false);
    } finally {
      setPushLoading(false);
    }
  };

  const toggleItems = [
    {
      key: "muteAll",
      icon: BellOff,
      title: "Mute All Notifications",
      subtitle: "Silence all messages, calls, and group alerts",
      color: "text-error",
      isMute: true,
    },
    {
      key: "messageNotifications",
      icon: MessageSquare,
      title: "Message Notifications",
      subtitle: "Alerts for new direct messages",
      color: "text-primary",
    },
    {
      key: "groupNotifications",
      icon: Users,
      title: "Group Notifications",
      subtitle: "Alerts for group activity & mentions",
      color: "text-secondary",
    },
    {
      key: "callNotifications",
      icon: PhoneCall,
      title: "Call Notifications",
      subtitle: "Ringtone and notification for incoming calls",
      color: "text-accent",
    },
    {
      key: "sound",
      icon: Volume2,
      title: "In-App Sound",
      subtitle: "Play sound for incoming messages",
      color: "text-info",
    },
    {
      key: "vibration",
      icon: Smartphone,
      title: "Haptic Vibration",
      subtitle: "Vibrate device on receiving alerts",
      color: "text-warning",
    },
    {
      key: "notificationPreview",
      icon: Eye,
      title: "Notification Preview",
      subtitle: "Show sender name and message content in popups",
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-base-content">Notification Preferences</h3>
          <p className="text-xs text-base-content/60">Customize alerts, sound, and browser push settings</p>
        </div>
      </div>

      {/* Browser Push Registration Card */}
      <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-base-100 text-primary">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-base-content">Browser Web Push Alerts</p>
            <p className="text-[11px] text-base-content/60">
              {pushSubscribed
                ? "Active on this device"
                : isPushSupported()
                ? "Receive alerts even when tab is backgrounded"
                : "Push not supported in this browser"}
            </p>
          </div>
        </div>

        {isPushSupported() && (
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={pushSubscribed}
            disabled={pushLoading}
            onChange={(e) => handlePushToggle(e.target.checked)}
          />
        )}
      </div>

      <div className="divide-y divide-base-200 bg-base-200/40 rounded-xl border border-base-300/60 overflow-hidden">
        {toggleItems.map((item) => {
          const Icon = item.icon;
          const isChecked = notifications[item.key];
          return (
            <div
              key={item.key}
              className={`flex items-center justify-between p-3.5 hover:bg-base-200/70 transition-colors ${
                item.isMute ? "bg-error/5 border-b border-error/20" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg bg-base-100 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-base-content">{item.title}</p>
                  <p className="text-[11px] text-base-content/60">{item.subtitle}</p>
                </div>
              </div>

              <input
                type="checkbox"
                className={`toggle toggle-sm ${item.isMute ? "toggle-error" : "toggle-primary"}`}
                checked={isChecked}
                onChange={(e) => updateNotification(item.key, e.target.checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsSection;
