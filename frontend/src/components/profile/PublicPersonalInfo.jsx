import {
  User, MapPin, Briefcase, GraduationCap, Heart, Calendar, MessageSquare,
} from "lucide-react";

const PublicPersonalInfo = ({ user }) => {
  if (!user) return null;

  const p = user.profile || {};

  const fields = [
    { icon: MessageSquare, label: "Bio", value: p.bio || "Available" },
    { icon: MapPin, label: "Location", value: p.location },
    { icon: Briefcase, label: "Work", value: p.work },
    { icon: GraduationCap, label: "Education", value: p.education },
    { icon: Calendar, label: "Date of Birth", value: p.dob ? new Date(p.dob).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : null },
    { icon: User, label: "Gender", value: p.gender },
  ].filter((f) => f.value);

  const interests = p.interests || [];
  const hobbies = p.hobbies || [];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10 text-primary">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-base-content">About {user.fullName?.split(" ")[0]}</h3>
          <p className="text-xs text-base-content/60">Public profile information</p>
        </div>
      </div>

      {fields.length > 0 ? (
        <div className="divide-y divide-base-200 rounded-xl border border-base-300/60 overflow-hidden">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3.5 bg-base-200/30 hover:bg-base-200/50 transition-colors">
              <div className="p-1.5 rounded-lg bg-base-100 text-primary mt-0.5">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-base-content/50 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-medium text-base-content mt-0.5 break-words">{value}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-base-content/50">
          This user hasn't filled in their profile information yet.
        </div>
      )}

      {/* Interests */}
      {interests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-base-content/60 flex items-center gap-1.5 px-1">
            <Heart className="w-3.5 h-3.5 text-error" /> Interests
          </p>
          <div className="flex flex-wrap gap-1.5">
            {interests.map((tag) => (
              <span key={tag} className="px-2.5 py-1 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hobbies */}
      {hobbies.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-base-content/60 px-1">Hobbies</p>
          <div className="flex flex-wrap gap-1.5">
            {hobbies.map((tag) => (
              <span key={tag} className="px-2.5 py-1 text-[11px] font-semibold bg-secondary/10 text-secondary border border-secondary/20 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPersonalInfo;
