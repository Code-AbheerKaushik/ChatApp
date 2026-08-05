import { useState } from "react";
import { Shield, Eye, Clock, Users, ArrowRight, Loader2 } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";

const VISIBILITY = ["Everyone", "Contacts", "Nobody"];
const GROUP_INVITE = ["Everyone", "Contacts"];

const PrivacyPicker = ({ label, icon: Icon, value, options, onChange, color }) => (
  <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300/60 space-y-2.5">
    <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
            value === opt
              ? "bg-primary text-primary-content border-primary shadow-xs scale-[1.02]"
              : "bg-base-100 text-base-content/70 border-base-300 hover:border-primary/40"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const StepPrivacy = ({ onNext }) => {
  const { draft, updateDraft, saveStep, isSavingStep } = useOnboardingStore();
  const [photoVis, setPhotoVis] = useState(draft.profilePhotoVisibility || "Everyone");
  const [lastSeenVis, setLastSeenVis] = useState(draft.lastSeenVisibility || "Everyone");
  const [groupInvite, setGroupInvite] = useState(draft.groupInvitePermission || "Everyone");

  const handleNext = async () => {
    const privacy = {
      profilePhotoVisibility: photoVis,
      lastSeenVisibility: lastSeenVis,
      groupInvitePermission: groupInvite,
    };
    updateDraft({ ...privacy });
    try {
      await saveStep(8, { privacy });
    } catch {}
    onNext();
  };

  return (
    <div className="flex flex-col space-y-6 animate-fadein">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-2">
          <Shield className="w-7 h-7 text-warning" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Privacy settings</h2>
        <p className="text-sm text-base-content/60">Choose what others can see. You can change this anytime.</p>
      </div>

      <div className="space-y-3">
        <PrivacyPicker
          label="Who can see your profile photo?"
          icon={Eye}
          value={photoVis}
          options={VISIBILITY}
          onChange={setPhotoVis}
          color="text-primary"
        />
        <PrivacyPicker
          label="Who can see your last seen?"
          icon={Clock}
          value={lastSeenVis}
          options={VISIBILITY}
          onChange={setLastSeenVis}
          color="text-secondary"
        />
        <PrivacyPicker
          label="Who can add you to groups?"
          icon={Users}
          value={groupInvite}
          options={GROUP_INVITE}
          onChange={setGroupInvite}
          color="text-accent"
        />
      </div>

      <button
        onClick={handleNext}
        disabled={isSavingStep}
        className="btn btn-primary rounded-2xl gap-2 h-12 shadow-lg hover:scale-[1.02] transition-all"
      >
        {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        Save & Continue
      </button>
    </div>
  );
};

export default StepPrivacy;
