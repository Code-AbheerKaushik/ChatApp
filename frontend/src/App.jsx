import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import OnboardingPage from "./pages/OnboardingPage";

import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  const needsOnboarding = authUser && authUser.onboardingComplete !== true;
  const isOnboardingRoute = location.pathname === "/onboarding";

  return (
    <div data-theme={theme}>
      {!isOnboardingRoute && <Navbar />}

      <Routes>
        <Route
          path="/"
          element={
            authUser ? (
              needsOnboarding ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <HomePage />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !authUser ? (
              <SignUpPage />
            ) : needsOnboarding ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            !authUser ? (
              <LoginPage />
            ) : needsOnboarding ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            authUser ? (
              needsOnboarding ? (
                <OnboardingPage />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/profile"
          element={
            authUser ? (
              needsOnboarding ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <ProfilePage />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>

      <Toaster />
    </div>
  );
};

export default App;
