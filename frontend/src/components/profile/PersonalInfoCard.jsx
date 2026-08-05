import { useAuthStore } from "../../store/useAuthStore";
import { useProfileStore } from "../../store/useProfileStore";
import { User, Mail, Phone, Calendar, MapPin, Smile, AtSign, Edit2, ShieldCheck } from "lucide-react";

const PersonalInfoCard = () => {
  const { authUser } = useAuthStore();
  const { extraProfile, openModal } = useProfileStore();

  const formattedDateJoined = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  const profile = authUser?.profile || {};
  const username = profile.username || authUser?.username || authUser?.fullName?.toLowerCase().replace(/\s+/g, "") || "user";
  const bio = profile.bio || authUser?.bio || "Available";
  const phone = profile.phone || authUser?.phone || "Not specified";
  const statusMessage = profile.statusMessage || "Can't talk, chat only 💬";
  const location = profile.location || authUser?.location || "Not specified";
  const dob = profile.dob || authUser?.dob || "Not specified";
  const gender = profile.gender || authUser?.gender || "Not specified";

  const infoItems = [
    {
      id: "name",
      icon: User,
      label: "Full Name",
      value: authUser?.fullName || "N/A",
      editable: true,
    },
    {
      id: "username",
      icon: AtSign,
      label: "Username",
      value: `@${username}`,
      editable: true,
    },
    {
      id: "email",
      icon: Mail,
      label: "Email Address",
      value: authUser?.email || "N/A",
      editable: false,
      badge: "Verified",
    },
    {
      id: "phone",
      icon: Phone,
      label: "Phone Number",
      value: phone,
      editable: true,
    },
    {
      id: "bio",
      icon: Smile,
      label: "Bio / About",
      value: bio,
      editable: true,
    },
    {
      id: "location",
      icon: MapPin,
      label: "Location",
      value: location,
      editable: true,
    },
    {
      id: "dob",
      icon: Calendar,
      label: "Date of Birth",
      value: dob,
      editable: true,
    },
    {
      id: "gender",
      icon: User,
      label: "Gender",
      value: gender,
      editable: true,
    },
    {
      id: "statusMessage",
      icon: Smile,
      label: "Status Message",
      value: statusMessage,
      editable: true,
    },
    {
      id: "joined",
      icon: ShieldCheck,
      label: "Member Since",
      value: formattedDateJoined,
      editable: false,
    },
  ];

  return (
    <div className="bg-base-100/90 backdrop-blur-md border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-base-content">Personal Information</h3>
          <p className="text-xs text-base-content/60">Your private account details</p>
        </div>
        <button
          onClick={() => openModal("editProfile")}
          className="btn btn-xs btn-outline btn-primary rounded-lg gap-1.5"
        >
          <Edit2 className="w-3 h-3" />
          Edit All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {infoItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-300/60 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-base-100 text-primary shadow-xs">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-base-content/50 font-medium">{item.label}</p>
                  <p className="text-xs sm:text-sm font-semibold text-base-content truncate mt-0.5">
                    {item.value}
                  </p>
                </div>
              </div>

              {item.editable ? (
                <button
                  onClick={() => openModal("editProfile", { field: item.id })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-base-100 rounded-md text-base-content/60 hover:text-primary"
                  title={`Edit ${item.label}`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              ) : item.badge ? (
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {item.badge}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalInfoCard;
