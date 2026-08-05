import { useState, useRef } from "react";
import { Camera, Upload, SkipForward, User, Loader2 } from "lucide-react";
import { useOnboardingStore } from "../../store/useOnboardingStore";
import { useAuthStore } from "../../store/useAuthStore";

const StepProfilePhoto = ({ onNext, onSkip }) => {
  const { draft, updateDraft, saveStep, isSavingStep } = useOnboardingStore();
  const { authUser, updateProfile } = useAuthStore();
  const [preview, setPreview] = useState(draft.profilePic || authUser?.profilePic || null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      updateDraft({ profilePic: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleNext = async () => {
    if (draft.profilePic) {
      try {
        await saveStep(1, { profilePic: draft.profilePic });
        // Also update authUser's profilePic via existing updateProfile
        await updateProfile({ profilePic: draft.profilePic });
      } catch {}
    }
    onNext();
  };

  return (
    <div className="flex flex-col items-center text-center space-y-7 animate-fadein">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Add a profile photo</h2>
        <p className="text-sm text-base-content/60">This is how others will recognise you on Chatty.</p>
      </div>

      {/* Avatar Preview */}
      <div className="relative">
        <div className="w-36 h-36 rounded-full border-4 border-primary/30 shadow-xl overflow-hidden bg-base-200 flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <User className="w-16 h-16 text-base-content/30" />
          )}
        </div>
        {preview && (
          <button
            onClick={() => { setPreview(null); updateDraft({ profilePic: "" }); }}
            className="absolute top-0 right-0 w-7 h-7 bg-error text-error-content rounded-full text-xs font-bold flex items-center justify-center shadow"
          >
            ×
          </button>
        )}
      </div>

      {/* Upload Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => fileRef.current?.click()}
          className="btn btn-outline btn-primary rounded-2xl gap-2 hover:scale-[1.01] transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload from Gallery
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <button
          onClick={() => cameraRef.current?.click()}
          className="btn btn-outline rounded-2xl gap-2 hover:scale-[1.01] transition-all"
        >
          <Camera className="w-4 h-4" />
          Take Photo with Camera
        </button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button
          onClick={handleNext}
          disabled={isSavingStep}
          className="btn btn-primary rounded-2xl gap-2 shadow-lg hover:scale-[1.02] transition-all"
        >
          {isSavingStep ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {preview ? "Save & Continue" : "Continue"}
        </button>
        <button
          onClick={onSkip}
          className="btn btn-ghost btn-sm text-base-content/50 gap-1 rounded-xl"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default StepProfilePhoto;
