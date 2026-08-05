import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
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
import { ArrowLeft, UserCheck, User, Shield, Bell, Palette, Database, Lock, Image } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isCheckingAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState("all"); // "all" | "personal" | "privacy" | "notifications" | "appearance" | "storage" | "security" | "media"

  if (isCheckingAuth && !authUser) {
    return (
      <div className="h-screen h-[100dvh] pt-20 px-4 max-w-4xl mx-auto space-y-4 animate-pulse">
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
    <div className="h-screen h-[100dvh] w-full flex flex-col bg-base-200/40 overflow-hidden relative">
      
      {/* Sticky Header Bar right under main Navbar */}
      <div className="flex-shrink-0 pt-16 bg-base-100/90 backdrop-blur-md border-b border-base-300 z-20">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-base-200/80 hover:bg-base-200 text-base-content transition-colors flex items-center justify-center"
              title="Back to Chats"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-base-content leading-tight">Profile & Settings</h1>
              <p className="text-[11px] text-base-content/60 hidden sm:block">Manage your profile, preferences & security</p>
            </div>
          </div>

          {/* Quick Filter Section Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-base-200/60 rounded-xl border border-base-300/60 messages-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200
                    ${isActive ? "bg-primary text-primary-content shadow-xs" : "text-base-content/70 hover:bg-base-100 hover:text-base-content"}
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Independent Scrollable Container */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden messages-scrollbar scroll-smooth">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 pb-28 sm:pb-16">
          
          {/* Profile Header & Quick Action Buttons */}
          <div className="space-y-4">
            <ProfileHeader />
            <QuickActions />
          </div>

          {/* Dynamic 2-Column Desktop / Stacked Mobile Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column (Desktop 5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {(activeTab === "all" || activeTab === "media") && <MediaSection />}
              {(activeTab === "all" || activeTab === "personal") && <StatsSection />}
              {(activeTab === "all" || activeTab === "personal" || activeTab === "security") && <AccountSection />}
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
      </div>

      {/* Interactive Global Modals */}
      <ProfileModals />
    </div>
  );
};

export default ProfilePage;
