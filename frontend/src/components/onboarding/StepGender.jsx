import { useState } from "react";
import { Users2, ArrowRight, Loader2, SkipForward } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";

const GENDERS = [
  { label: "Male", emoji: "👨" },
  { label: "Female", emoji: "👩" },
  { label: "Non-binary", emoji: "🧑" },
  { label: "Prefer not to say", emoji: "🔒" },
];

const StepGender = ({ onNext, onSkip }) => {
  const { draft, updateDraft, saveStep, isSavingStep } = useOnboardingStore();
  const [selected, setSelected] = useState(draft.gender || "");

  const handleNext = async () => {
    if (selected) {
      updateDraft({ gender: selected });
      try {
        await saveStep(6, { profile: { gender: selected } });
      } catch {}
    }
    onNext();
  };

  return (
    <div className="flex flex-col space-y-7 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center mx-auto mb-2">
          <Users2 className="w-7 h-7 text-info" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">How do you identify?</h2>
        <p className="text-sm text-base-content/60">Completely optional. You can skip this if you prefer not to share.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GENDERS.map(({ label, emoji }) => (
          <button
            key={label}
            onClick={() => setSelected(label === selected ? "" : label)}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 ${
              selected === label
                ? "border-primary bg-primary/10 shadow-sm scale-[1.03]"
                : "border-base-300 bg-base-200/40 hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <span className="text-3xl">{emoji}</span>
            <span className={`text-xs font-semibold ${selected === label ? "text-primary" : "text-base-content/70"}`}>
              {label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleNext}
          disabled={isSavingStep}
          className="btn btn-primary rounded-2xl gap-2 h-12 shadow-lg hover:scale-[1.02] transition-all"
        >
          {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {selected ? "Save & Continue" : "Continue"}
        </button>
        <button onClick={onSkip} className="btn btn-ghost btn-sm text-base-content/50 gap-1 rounded-xl">
          <SkipForward className="w-3.5 h-3.5" />
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default StepGender;
