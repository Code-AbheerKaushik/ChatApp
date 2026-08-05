import { useState } from "react";
import { User2, Loader2, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";

const StepName = ({ onNext }) => {
  const { draft, updateDraft, saveStep, isSavingStep } = useOnboardingStore();
  const [firstName, setFirstName] = useState(draft.firstName || "");
  const [lastName, setLastName] = useState(draft.lastName || "");
  const [error, setError] = useState("");

  const handleNext = async () => {
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setError("");
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
    updateDraft({ firstName: firstName.trim(), lastName: lastName.trim(), displayName });
    try {
      await saveStep(2, { profile: { firstName: firstName.trim(), lastName: lastName.trim(), displayName } });
    } catch {}
    onNext();
  };

  return (
    <div className="flex flex-col space-y-7 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <User2 className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">What's your name?</h2>
        <p className="text-sm text-base-content/60">This is how you'll appear in chats and your profile.</p>
      </div>

      <div className="space-y-4">
        <div className="form-control">
          <label className="label pb-1">
            <span className="label-text font-semibold">First Name <span className="text-error">*</span></span>
          </label>
          <input
            type="text"
            autoFocus
            className={`input input-bordered w-full text-base h-12 rounded-xl ${error ? "input-error" : ""}`}
            placeholder="Alex"
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
          />
          {error && <p className="text-xs text-error mt-1">{error}</p>}
        </div>

        <div className="form-control">
          <label className="label pb-1">
            <span className="label-text font-semibold">Last Name <span className="text-base-content/40 font-normal">(optional)</span></span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full text-base h-12 rounded-xl"
            placeholder="Johnson"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
          />
        </div>

        {(firstName || lastName) && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-base-content/70">
            Display name: <span className="font-semibold text-base-content">
              {`${firstName} ${lastName}`.trim() || "—"}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={isSavingStep || !firstName.trim()}
        className="btn btn-primary rounded-2xl gap-2 h-12 shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
      >
        {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Continue
      </button>
    </div>
  );
};

export default StepName;
