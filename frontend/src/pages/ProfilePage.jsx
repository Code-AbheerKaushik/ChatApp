import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import ProfileHeader from "../components/profile/ProfileHeader";
import QuickActions from "../components/profile/QuickActions";
import PersonalInfoCard from "../components/profile/PersonalInfoCard";
import PrivacySection from "../components/profile/PrivacySection";
import NotificationsSection from "../components/profile/NotificationsSection";
import AppearanceSection from "../components/profile/AppearanceSection";
import StorageDataSection from "../components/profile/StorageDataSection";
import SecuritySection from "../components/profile/SecuritySection";
import MediaSection from "../components/profile/MediaSection";
import AccountSection from "../components/profile/AccountSection";
import StatsSection from "../components/profile/StatsSection";
import ProfileModals from "../components/profile/ProfileModals";
import { User, Shield, Bell, Palette, Database, Lock, UserCheck, Image } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isCheckingAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState("all"); // "all" | "personal" | "privacy" | "notifications" | "appearance" | "storage" | "security" | "media" | "account"

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="min-h-screen pt-20 px-4 max-w-6xl mx-auto space-y-4 animate-pulse">
        <div className="h-44 bg-base-300 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-64 bg-base-300 rounded-2xl" />
          <div className="h-64 bg-base-300 rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "all", label: "Overview", icon: UserCheck },
    { id: "personal", label: "Personal Info", icon: User },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "storage", label: "Storage", icon: Database },
    { id: "security", label: "Security", icon: Lock },
    { id: "media", label: "Media", icon: Image },
  ];

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-12 overflow-y-auto messages-scrollbar bg-base-200/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Navigation Category Bar for Fast Desktop & Mobile Jumping */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-base-100/80 backdrop-blur-md rounded-2xl border border-base-300 shadow-xs messages-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200
                  ${isActive ? "bg-primary text-primary-content shadow-sm scale-[1.02]" : "text-base-content/70 hover:bg-base-200 hover:text-base-content"}
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Profile Header & Quick Actions always prominent */}
        <div className="space-y-4">
          <ProfileHeader />
          <QuickActions />
        </div>

        {/* Dynamic Desktop 2-Column & Mobile Stacked Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Desktop 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {(activeTab === "all" || activeTab === "media") && <MediaSection />}
            {(activeTab === "all" || activeTab === "personal") && <StatsSection />}
            {(activeTab === "all" || activeTab === "account") && <AccountSection />}
          </div>

          {/* Right Column (Desktop 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {(activeTab === "all" || activeTab === "personal") && <PersonalInfoCard />}
            {(activeTab === "all" || activeTab === "privacy") && <PrivacySection />}
            {(activeTab === "all" || activeTab === "notifications") && <NotificationsSection />}
            {(activeTab === "all" || activeTab === "appearance") && <AppearanceSection />}
            {(activeTab === "all" || activeTab === "storage") && <StorageDataSection />}
            {(activeTab === "all" || activeTab === "security") && <SecuritySection />}
          </div>

        </div>
      </div>

      {/* Global Modals for Profile Management */}
      <ProfileModals />
    </div>
  );
};

export default ProfilePage;
