import { useState, useEffect, useRef } from "react";
import { AtSign, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";

const StepUsername = ({ onNext }) => {
  const { draft, updateDraft, saveStep, isSavingStep, checkUsername, isCheckingUsername, usernameAvailable } = useOnboardingStore();
  const [value, setValue] = useState(draft.username || "");
  const [touched, setTouched] = useState(false);
  const debounceRef = useRef(null);

  const isValidFormat = /^[a-z0-9_.]{3,20}$/.test(value);
  const canContinue = isValidFormat && usernameAvailable === true && !isCheckingUsername;

  useEffect(() => {
    if (!value || !isValidFormat) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkUsername(value);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.toLowerCase().replace(/\s+/g, "");
    setValue(raw);
    setTouched(true);
  };

  const handleNext = async () => {
    if (!canContinue) return;
    updateDraft({ username: value });
    try {
      await saveStep(3, { profile: { username: value } });
    } catch {}
    onNext();
  };

  const getStatusIcon = () => {
    if (!touched || !value) return null;
    if (!isValidFormat) return <XCircle className="w-4 h-4 text-error" />;
    if (isCheckingUsername) return <Loader2 className="w-4 h-4 animate-spin text-base-content/50" />;
    if (usernameAvailable === true) return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (usernameAvailable === false) return <XCircle className="w-4 h-4 text-error" />;
    return null;
  };

  const getStatusText = () => {
    if (!touched || !value) return null;
    if (value.length < 3) return { msg: "At least 3 characters required", cls: "text-error" };
    if (!isValidFormat) return { msg: "Only lowercase letters, numbers, _ and . allowed", cls: "text-error" };
    if (isCheckingUsername) return { msg: "Checking availability…", cls: "text-base-content/50" };
    if (usernameAvailable === true) return { msg: `@${value} is available!`, cls: "text-success" };
    if (usernameAvailable === false) return { msg: `@${value} is already taken`, cls: "text-error" };
    return null;
  };

  const status = getStatusText();

  return (
    <div className="flex flex-col space-y-7 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-2">
          <AtSign className="w-7 h-7 text-secondary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Choose a username</h2>
        <p className="text-sm text-base-content/60">People can find and mention you using your username.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-lg">@</span>
          <input
            type="text"
            autoFocus
            className={`input input-bordered w-full pl-9 text-base h-14 rounded-2xl text-lg font-semibold tracking-wide
              ${touched && value && !isValidFormat ? "input-error" :
                usernameAvailable === true ? "input-success" :
                usernameAvailable === false ? "input-error" : ""}`}
            placeholder="your_username"
            value={value}
            onChange={handleChange}
            maxLength={20}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {getStatusIcon()}
          </span>
        </div>

        {status && (
          <p className={`text-xs font-medium ${status.cls}`}>{status.msg}</p>
        )}

        <div className="text-xs text-base-content/40 space-y-0.5 mt-1">
          <p>· 3–20 characters · lowercase letters, numbers, _ and .</p>
          <p>· You can change this later in your profile settings</p>
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!canContinue || isSavingStep}
        className="btn btn-primary rounded-2xl gap-2 h-12 shadow-lg hover:scale-[1.02] transition-all disabled:opacity-40"
      >
        {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Continue
      </button>
    </div>
  );
};

export default StepUsername;
