import { useThemeStore } from "../../store/useThemeStore";
import { useProfileStore } from "../../store/useProfileStore";
import { THEMES } from "../../constants";
import { Palette, Type, Layout, Image, Sparkles } from "lucide-react";

const AppearanceSection = () => {
  const { theme, setTheme } = useThemeStore();
  const { appearance, updateAppearance } = useProfileStore();

  const fontSizes = ["Small", "Medium", "Large"];
  const wallpapers = [
    { id: "default", name: "Default" },
    { id: "gradient", name: "Gradient" },
    { id: "pattern", name: "Doodle" },
    { id: "dark", name: "Midnight" },
  ];
  const bubbleStyles = [
    { id: "rounded", name: "Modern Round" },
    { id: "glass", name: "Glassmorphism" },
    { id: "classic", name: "Classic Tail" },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-base-content">Appearance & Customization</h3>
          <p className="text-xs text-base-content/60">Customize application themes, wallpaper, and layout styling</p>
        </div>
      </div>

      {/* App Theme Selector Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-base-content">
          <span>Active Theme ({THEMES.length} options)</span>
          <span className="text-primary capitalize">{theme}</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1 messages-scrollbar">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`
                group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border
                ${theme === t ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-base-300 hover:border-primary/40 bg-base-200/40"}
              `}
            >
              <div className="relative h-6 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-0.5 p-1 bg-base-100">
                  <div className="rounded-xs bg-primary" />
                  <div className="rounded-xs bg-secondary" />
                  <div className="rounded-xs bg-accent" />
                  <div className="rounded-xs bg-neutral" />
                </div>
              </div>
              <span className="text-[10px] font-medium truncate w-full text-center capitalize text-base-content/80">
                {t}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size & Density Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Font Size */}
        <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-300/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-base-content">
            <Type className="w-4 h-4 text-primary" />
            <span>Chat Font Size</span>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-base-100 p-1 rounded-lg border border-base-300">
            {fontSizes.map((size) => (
              <button
                key={size}
                onClick={() => updateAppearance("fontSize", size)}
                className={`py-1 text-xs font-medium rounded-md transition-all ${
                  appearance.fontSize === size ? "bg-primary text-primary-content shadow-xs" : "text-base-content/70 hover:bg-base-200"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Message Density */}
        <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-300/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-base-content">
            <Layout className="w-4 h-4 text-secondary" />
            <span>Message Density</span>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-base-100 p-1 rounded-lg border border-base-300">
            {["compact", "comfortable"].map((density) => (
              <button
                key={density}
                onClick={() => updateAppearance("messageDensity", density)}
                className={`py-1 text-xs font-medium rounded-md transition-all capitalize ${
                  appearance.messageDensity === density ? "bg-primary text-primary-content shadow-xs" : "text-base-content/70 hover:bg-base-200"
                }`}
              >
                {density}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Wallpaper & Bubble Style Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Chat Wallpaper */}
        <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-300/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-base-content">
            <Image className="w-4 h-4 text-accent" />
            <span>Chat Wallpaper</span>
          </div>
          <select
            value={appearance.wallpaper}
            onChange={(e) => updateAppearance("wallpaper", e.target.value)}
            className="select select-sm select-bordered w-full text-xs rounded-lg bg-base-100 focus:outline-none"
          >
            {wallpapers.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* Bubble Style */}
        <div className="p-3.5 rounded-xl bg-base-200/50 border border-base-300/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-base-content">
            <Sparkles className="w-4 h-4 text-info" />
            <span>Chat Bubble Style</span>
          </div>
          <select
            value={appearance.bubbleStyle}
            onChange={(e) => updateAppearance("bubbleStyle", e.target.value)}
            className="select select-sm select-bordered w-full text-xs rounded-lg bg-base-100 focus:outline-none"
          >
            {bubbleStyles.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSection;
