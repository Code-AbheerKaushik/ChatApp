import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useOnboardingStore, TOTAL_STEPS } from "../store/useOnboardingStore";
import { ArrowLeft, MessageSquare, ShieldCheck } from "lucide-react";

import StepWelcome from "../components/onboarding/StepWelcome";
import StepProfilePhoto from "../components/onboarding/StepProfilePhoto";
import StepName from "../components/onboarding/StepName";
import StepUsername from "../components/onboarding/StepUsername";
import StepBio from "../components/onboarding/StepBio";
import StepBirthday from "../components/onboarding/StepBirthday";
import StepGender from "../components/onboarding/StepGender";
import StepLocation from "../components/onboarding/StepLocation";
import StepPrivacy from "../components/onboarding/StepPrivacy";
import StepPreview from "../components/onboarding/StepPreview";

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthStore();
  const {
    currentStep,
    goToStep,
    nextStep,
    prevStep,
    resumeFromUser,
    completeOnboarding,
  } = useOnboardingStore();

  useEffect(() => {
    if (authUser) {
      resumeFromUser(authUser);
    }
  }, [authUser, resumeFromUser]);

  const handleComplete = async () => {
    try {
      const updatedUser = await completeOnboarding();
      if (setAuthUser && updatedUser) {
        setAuthUser(updatedUser);
      } else if (setAuthUser) {
        setAuthUser({ ...authUser, onboardingComplete: true });
      }
      navigate("/", { replace: true });
    } catch {
      // handled by store toast
    }
  };

  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome onNext={nextStep} />;
      case 1:
        return <StepProfilePhoto onNext={nextStep} onSkip={nextStep} />;
      case 2:
        return <StepName onNext={nextStep} />;
      case 3:
        return <StepUsername onNext={nextStep} />;
      case 4:
        return <StepBio onNext={nextStep} onSkip={nextStep} />;
      case 5:
        return <StepBirthday onNext={nextStep} onSkip={nextStep} />;
      case 6:
        return <StepGender onNext={nextStep} onSkip={nextStep} />;
      case 7:
        return <StepLocation onNext={nextStep} onSkip={nextStep} />;
      case 8:
        return <StepPrivacy onNext={nextStep} />;
      case 9:
      case 10:
        return <StepPreview onComplete={handleComplete} />;
      default:
        return <StepPreview onComplete={handleComplete} />;
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-base-200/50 flex flex-col justify-between items-center relative overflow-y-auto py-4 sm:py-8 px-3 sm:px-6 safe-top safe-bottom scrollbar-gutter-stable">
      {/* Background Subtle Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Progress */}
      <div className="w-full max-w-lg space-y-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 font-bold text-base sm:text-lg text-base-content">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Chatty Setup</span>
            </div>
          </div>

          {currentStep > 0 ? (
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-base-300/70 text-base-content/80">
              Step {currentStep} of {TOTAL_STEPS}
            </div>
          ) : (
            <button
              onClick={() => useAuthStore.getState().logout()}
              className="text-xs font-medium text-primary hover:underline"
            >
              Log in with existing account
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-base-300/80 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step Container Card */}
      <div className="w-full max-w-lg my-auto py-4 z-10">
        <div className="bg-base-100/95 backdrop-blur-lg border border-base-300/70 shadow-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-h-[82vh] overflow-y-auto custom-scrollbar">
          {renderStep()}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="w-full max-w-lg text-center z-10 pt-2 pb-2 flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-base-content/50">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        <span>Your profile data is encrypted and can be edited anytime in settings</span>
      </div>
    </div>
  );
};

export default OnboardingPage;
