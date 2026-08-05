import { useState } from "react";
import { Cake, ArrowRight, Loader2, SkipForward } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";

const VISIBILITY_OPTIONS = ["Everyone", "Contacts", "Nobody"];

const StepBirthday = ({ onNext, onSkip }) => {
  const { draft, updateDraft, saveStep, isSavingStep } = useOnboardingStore();
  const [dob, setDob] = useState(draft.dob || "");
  const [visibility, setVisibility] = useState(draft.birthdayVisibility || "Contacts");

  const handleNext = async () => {
    if (!dob) { onSkip(); return; }
    updateDraft({ dob, birthdayVisibility: visibility });
    try {
      await saveStep(5, {
        profile: { dob },
        privacy: { birthdayVisibility: visibility },
      });
    } catch {}
    onNext();
  };

  return (
    <div className="flex flex-col space-y-7 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-2">
          <Cake className="w-7 h-7 text-error" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">When's your birthday?</h2>
        <p className="text-sm text-base-content/60">We'll wish you happy birthday! Control who can see it below.</p>
      </div>

      <div className="space-y-5">
        <div className="form-control">
          <label className="label pb-1">
            <span className="label-text font-semibold">Date of Birth</span>
          </label>
          <input
            type="date"
            className="input input-bordered w-full h-12 rounded-xl text-base"
            value={dob}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="label-text font-semibold text-sm block">Who can see your birthday?</label>
          <div className="grid grid-cols-3 gap-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setVisibility(opt)}
                className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  visibility === opt
                    ? "bg-primary text-primary-content border-primary shadow-sm scale-[1.03]"
                    : "bg-base-200/60 text-base-content/70 border-base-300 hover:border-primary/40"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleNext}
          disabled={isSavingStep}
          className="btn btn-primary rounded-2xl gap-2 h-12 shadow-lg hover:scale-[1.02] transition-all"
        >
          {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {dob ? "Save & Continue" : "Continue"}
        </button>
        <button onClick={onSkip} className="btn btn-ghost btn-sm text-base-content/50 gap-1 rounded-xl">
          <SkipForward className="w-3.5 h-3.5" />
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default StepBirthday;
