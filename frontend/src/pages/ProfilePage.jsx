import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useProfileStore } from "../store/useProfileStore";
import { useChatStore } from "../store/useChatStore";
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
import PublicProfileActions from "../components/profile/PublicProfileActions";
import PublicPersonalInfo from "../components/profile/PublicPersonalInfo";
import PublicStatsCard from "../components/profile/PublicStatsCard";
import DpLightbox from "../components/profile/DpLightbox";
import {
  ArrowLeft, UserCheck, User, Shield, Bell, Palette, Database, Lock, Image, Loader2,
} from "lucide-react";

const ProfilePage = () => {
  const { userId } = useParams(); // Present only on /user/:userId route
  const { authUser, isCheckingAuth } = useAuthStore();
  const { loadPrivacyFromUser, fetchPublicProfile, viewedUser, isLoadingViewedUser, fullscreenDpUrl, closeFullscreenDp } = useProfileStore();
  const { setSelectedUser } = useChatStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");

  // Determine if we're viewing own profile or another user's
  const isOwnProfile = !userId || (authUser && String(userId) === String(authUser._id));

  useEffect(() => {
    if (isOwnProfile && authUser) {
      loadPrivacyFromUser(authUser);
    }
  }, [authUser, isOwnProfile]);

  // Fetch public profile when viewing another user
  useEffect(() => {
    if (!isOwnProfile && userId) {
      fetchPublicProfile(userId);
    }
  }, [userId, isOwnProfile]);

  // Loading skeleton
  if ((isCheckingAuth && !authUser) || (!isOwnProfile && isLoadingViewedUser)) {
    return (
      <div className="h-screen h-[100dvh] pt-20 px-4 w-[88%] lg:w-[84%] max-w-[1500px] mx-auto space-y-4 animate-pulse">
        <div className="h-44 bg-base-300 rounded-2xl w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-base-300 rounded-2xl" />
          <div className="h-64 bg-base-300 rounded-2xl" />
        </div>
      </div>
    );
  }

  // If fetched public profile is not found
  if (!isOwnProfile && !viewedUser && !isLoadingViewedUser) {
    return (
      <div className="h-screen h-[100dvh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-6xl">👤</div>
        <h2 className="text-xl font-bold text-base-content">User Not Found</h2>
        <p className="text-sm text-base-content/60">This profile does not exist or is private.</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary btn-sm rounded-xl">Go Back</button>
      </div>
    );
  }

  // Data to display - own profile vs public user
  const profileUser = isOwnProfile ? authUser : viewedUser;

  // Own-profile tabs
  const ownTabs = [
    { id: "all", label: "Overview", icon: UserCheck },
    { id: "personal", label: "Personal Info", icon: User },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "storage", label: "Storage", icon: Database },
    { id: "security", label: "Security", icon: Lock },
    { id: "media", label: "Media", icon: Image },
  ];

  // Public-profile tabs (read-only, settings hidden)
  const publicTabs = [
    { id: "all", label: "Overview", icon: UserCheck },
    { id: "personal", label: "About", icon: User },
    { id: "media", label: "Media", icon: Image },
  ];

  const tabs = isOwnProfile ? ownTabs : publicTabs;

  const headerTitle = isOwnProfile
    ? "Profile & Settings"
    : (profileUser?.fullName || "User Profile");

  const headerSubtitle = isOwnProfile
    ? "Manage your profile details, privacy, appearance, and settings"
    : `@${profileUser?.username || "—"}`;

  return (
    <>
      {/* Full-screen DP Lightbox */}
      {fullscreenDpUrl && <DpLightbox imageUrl={fullscreenDpUrl} onClose={closeFullscreenDp} />}

      <div className="h-screen h-[100dvh] w-full flex flex-col bg-base-200/40 overflow-hidden relative">

        {/* Sticky Top Sub-Header Bar */}
        <div className="flex-shrink-0 pt-16 bg-base-100/90 backdrop-blur-md border-b border-base-300 z-20">
          <div className="w-[92%] sm:w-[88%] lg:w-[84%] max-w-[1500px] mx-auto px-2 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl bg-base-200/80 hover:bg-base-200 text-base-content transition-colors flex items-center justify-center"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-base-content leading-tight">{headerTitle}</h1>
                <p className="text-[11px] text-base-content/60 hidden sm:block">{headerSubtitle}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-base-200/60 rounded-xl border border-base-300/60 messages-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.label}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200
                      ${isActive ? "bg-primary text-primary-content shadow-xs scale-[1.02]" : "text-base-content/70 hover:bg-base-100 hover:text-base-content"}
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Scrollable Container */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden messages-scrollbar scroll-smooth">
          <div className="w-[92%] sm:w-[88%] lg:w-[84%] max-w-[1500px] mx-auto px-2 sm:px-4 lg:px-6 py-5 sm:py-6 space-y-6 pb-28 sm:pb-16">

            {/* ─── OWN PROFILE (fully editable) ─── */}
            {isOwnProfile ? (
              <>
                <div className="space-y-4">
                  <ProfileHeader isOwnProfile={true} user={authUser} />
                  <QuickActions isOwnProfile={true} />
                </div>

                {activeTab === "all" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <PersonalInfoCard isOwnProfile={true} />
                      <MediaSection />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <PrivacySection />
                      <NotificationsSection />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <StorageDataSection />
                      <SecuritySection />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <AppearanceSection />
                      <div className="space-y-6">
                        <StatsSection />
                        <AccountSection />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab !== "all" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {activeTab === "personal" && (<><PersonalInfoCard isOwnProfile={true} /><StatsSection /></>)}
                    {activeTab === "privacy" && (<><PrivacySection /><SecuritySection /></>)}
                    {activeTab === "notifications" && (<><NotificationsSection /><PrivacySection /></>)}
                    {activeTab === "appearance" && (<><AppearanceSection /><StatsSection /></>)}
                    {activeTab === "storage" && (<><StorageDataSection /><MediaSection /></>)}
                    {activeTab === "security" && (<><SecuritySection /><AccountSection /></>)}
                    {activeTab === "media" && (<><MediaSection /><StorageDataSection /></>)}
                  </div>
                )}

                {/* Own Profile Modals */}
                <ProfileModals />
              </>
            ) : (
              /* ─── PUBLIC PROFILE (read-only) ─── */
              <>
                <div className="space-y-4">
                  <ProfileHeader isOwnProfile={false} user={profileUser} />
                  <PublicProfileActions user={profileUser} />
                </div>

                {activeTab === "all" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <PublicPersonalInfo user={profileUser} />
                      <PublicStatsCard user={profileUser} />
                    </div>
                    <MediaSection userId={profileUser?._id} readOnly />
                  </div>
                )}

                {activeTab === "personal" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <PublicPersonalInfo user={profileUser} />
                    <PublicStatsCard user={profileUser} />
                  </div>
                )}

                {activeTab === "media" && (
                  <MediaSection userId={profileUser?._id} readOnly />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
