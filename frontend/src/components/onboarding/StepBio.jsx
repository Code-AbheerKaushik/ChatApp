import { useState } from "react";
import { Smile, ArrowRight, Loader2, SkipForward } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";

const MAX = 150;

const StepBio = ({ onNext, onSkip }) => {
  const { draft, updateDraft, saveStep, isSavingStep } = useOnboardingStore();
  const [bio, setBio] = useState(draft.bio || "");

  const remaining = MAX - bio.length;

  const handleNext = async () => {
    updateDraft({ bio });
    try {
      await saveStep(4, { profile: { bio } });
    } catch {}
    onNext();
  };

  return (
    <div className="flex flex-col space-y-7 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
          <Smile className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Write a short bio</h2>
        <p className="text-sm text-base-content/60">Tell people a little about yourself. You can skip this and add it later.</p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <textarea
            autoFocus
            className="textarea textarea-bordered w-full h-32 text-base rounded-2xl resize-none leading-relaxed"
            placeholder={`Student | Developer | Coffee lover ☕`}
            value={bio}
            maxLength={MAX}
            onChange={(e) => setBio(e.target.value)}
          />
          <span
            className={`absolute bottom-3 right-4 text-xs font-medium transition-colors ${
              remaining <= 20 ? "text-error" : remaining <= 50 ? "text-warning" : "text-base-content/40"
            }`}
          >
            {remaining}
          </span>
        </div>

        {/* Character progress bar */}
        <div className="h-1 w-full bg-base-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              remaining <= 20 ? "bg-error" : remaining <= 50 ? "bg-warning" : "bg-primary"
            }`}
            style={{ width: `${((MAX - remaining) / MAX) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleNext}
          disabled={isSavingStep}
          className="btn btn-primary rounded-2xl gap-2 h-12 shadow-lg hover:scale-[1.02] transition-all"
        >
          {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {bio.trim() ? "Save & Continue" : "Continue"}
        </button>
        {!bio.trim() && (
          <button onClick={onSkip} className="btn btn-ghost btn-sm text-base-content/50 gap-1 rounded-xl">
            <SkipForward className="w-3.5 h-3.5" />
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default StepBio;
