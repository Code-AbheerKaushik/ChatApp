import { useState } from "react";
import { MapPin, ArrowRight, Loader2, SkipForward, Navigation } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import toast from "react-hot-toast";

const StepLocation = ({ onNext, onSkip }) => {
  const { draft, updateDraft, saveStep, isSavingStep } = useOnboardingStore();
  const [location, setLocation] = useState(draft.location || "");
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          const country = data.address?.country || "";
          const detected = [city, country].filter(Boolean).join(", ");
          setLocation(detected);
          updateDraft({ location: detected });
        } catch {
          toast.error("Could not detect location. Please enter manually.");
        } finally {
          setDetecting(false);
        }
      },
      () => {
        toast.error("Location access denied. Please enter manually.");
        setDetecting(false);
      }
    );
  };

  const handleNext = async () => {
    if (location.trim()) {
      updateDraft({ location: location.trim() });
      try {
        await saveStep(7, { profile: { location: location.trim() } });
      } catch {}
    }
    onNext();
  };

  return (
    <div className="flex flex-col space-y-7 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
          <MapPin className="w-7 h-7 text-emerald-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Where are you located?</h2>
        <p className="text-sm text-base-content/60">Help friends nearby discover you. City and country only — no GPS stored.</p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input
            type="text"
            autoFocus
            className="input input-bordered w-full pl-10 h-12 text-base rounded-xl"
            placeholder="San Francisco, California"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNext()}
          />
        </div>

        <button
          onClick={detectLocation}
          disabled={detecting}
          className="btn btn-outline btn-sm rounded-xl w-full gap-2 hover:border-primary/60"
        >
          {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          {detecting ? "Detecting…" : "Use My Current Location"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleNext}
          disabled={isSavingStep}
          className="btn btn-primary rounded-2xl gap-2 h-12 shadow-lg hover:scale-[1.02] transition-all"
        >
          {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {location.trim() ? "Save & Continue" : "Continue"}
        </button>
        <button onClick={onSkip} className="btn btn-ghost btn-sm text-base-content/50 gap-1 rounded-xl">
          <SkipForward className="w-3.5 h-3.5" />
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default StepLocation;
