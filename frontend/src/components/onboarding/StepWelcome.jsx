import { MessageSquare, Sparkles, ArrowRight, LogIn } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

const StepWelcome = ({ onNext }) => {
  const { logout } = useAuthStore();

  return (
    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-fadein">
      {/* Logo */}
      <div className="relative">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg">
          <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-content" />
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-2 sm:space-y-3">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-base-content leading-tight">
          Welcome to Chatty!
        </h1>
        <p className="text-base-content/60 text-sm sm:text-lg max-w-xs leading-relaxed">
          Let's set up your profile so people can find and connect with you.
        </p>
      </div>

      {/* Feature Pills */}
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 max-w-xs">
        {["Profile Photo", "Username", "Bio", "Privacy Controls"].map((f) => (
          <span
            key={f}
            className="px-2.5 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full border border-primary/20"
          >
            {f}
          </span>
        ))}
      </div>

      <p className="text-xs text-base-content/40 max-w-xs">
        Takes about 2 minutes · You can edit everything later
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs pt-1">
        <button
          onClick={onNext}
          className="btn btn-primary btn-md sm:btn-lg w-full rounded-2xl gap-2 shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Let's Get Started
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Option for pre-existing users */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-base-content/70">
          <span>Already have an account?</span>
          <button
            onClick={logout}
            className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            Log In
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepWelcome;
