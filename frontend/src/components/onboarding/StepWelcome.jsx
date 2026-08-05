import { MessageSquare, Sparkles, ArrowRight } from "lucide-react";

const StepWelcome = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center text-center space-y-8 animate-fadein">
      {/* Logo */}
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg">
          <MessageSquare className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4 text-primary-content" />
        </div>
      </div>

      {/* Headline */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content leading-tight">
          Welcome to Chatty!
        </h1>
        <p className="text-base-content/60 text-base sm:text-lg max-w-xs leading-relaxed">
          Let's set up your profile so people can find and connect with you.
        </p>
      </div>

      {/* Feature Pills */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
        {["Profile Photo", "Username", "Bio", "Privacy Controls"].map((f) => (
          <span
            key={f}
            className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-full border border-primary/20"
          >
            {f}
          </span>
        ))}
      </div>

      <p className="text-xs text-base-content/40 max-w-xs">
        Takes about 2 minutes · You can edit everything later
      </p>

      {/* CTA */}
      <button
        onClick={onNext}
        className="btn btn-primary btn-lg w-full max-w-xs rounded-2xl gap-2 shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
      >
        Let's Get Started
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default StepWelcome;
