import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { Users, X, Camera, Check, Clock } from "lucide-react";
import toast from "react-hot-toast";

const DISAPPEARING_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "90 days", value: 7776000 },
];

const CreateGroupModal = () => {
  const { users } = useChatStore();
  const { authUser } = useAuthStore();
  const { createGroupModalOpen, setCreateGroupModalOpen, createGroup } = useGroupStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupPic, setGroupPic] = useState("");
  const [disappearingDuration, setDisappearingDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!createGroupModalOpen) return null;

  const handleMemberToggle = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Group image must be under 5MB");

    const reader = new FileReader();
    reader.onloadend = () => setGroupPic(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter a group name");
    if (selectedMembers.length === 0) return toast.error("Select at least 1 member");

    setLoading(true);
    try {
      await createGroup({
        name: name.trim(),
        description: description.trim(),
        memberIds: selectedMembers,
        groupPic,
        disappearingDuration,
      });
      setName("");
      setDescription("");
      setSelectedMembers([]);
      setGroupPic("");
      setDisappearingDuration(0);
    } catch {
      // Error handled by store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setCreateGroupModalOpen(false)}>
      <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h3 className="font-bold text-base">New Group Chat</h3>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setCreateGroupModalOpen(false)}>
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 messages-scrollbar">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <img
                src={groupPic || "/avatar.png"}
                alt="Group Avatar"
                className="size-20 rounded-full object-cover border-2 border-primary"
              />
              <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-content rounded-full cursor-pointer shadow-md hover:scale-110 transition-transform">
                <Camera className="size-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
            <span className="text-[11px] text-base-content/60">Optional Group Photo</span>
          </div>

          {/* Group Name & Description */}
          <div>
            <label className="label text-xs font-semibold py-1">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Project Team, Weekend Trip"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-sm w-full rounded-xl"
              maxLength={40}
              required
            />
          </div>

          <div>
            <label className="label text-xs font-semibold py-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="Group topic or rules..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input input-bordered input-sm w-full rounded-xl"
              maxLength={100}
            />
          </div>

          {/* Disappearing Messages Timer Select */}
          <div>
            <label className="label text-xs font-semibold py-1 flex items-center gap-1">
              <Clock className="size-3.5 text-primary" /> Disappearing Messages
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {DISAPPEARING_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setDisappearingDuration(opt.value)}
                  className={`btn btn-xs rounded-xl ${
                    disappearingDuration === opt.value ? "btn-primary font-bold" : "btn-ghost bg-base-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Member Selection List */}
          <div>
            <label className="label text-xs font-semibold py-1">
              Select Members ({selectedMembers.length})
            </label>
            <div className="space-y-1 max-h-44 overflow-y-auto messages-scrollbar border border-base-300 rounded-2xl p-2">
              {users
                .filter((u) => String(u._id) !== String(authUser?._id))
                .map((u) => {
                  const isChecked = selectedMembers.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-base-200 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={u.profilePic || "/avatar.png"} alt={u.fullName} className="size-8 rounded-full object-cover" />
                        <span className="text-xs font-medium truncate">{u.fullName}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleMemberToggle(u._id)}
                        className="checkbox checkbox-primary checkbox-xs rounded-md"
                      />
                    </label>
                  );
                })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn btn-primary btn-sm w-full rounded-xl">
              {loading ? <span className="loading loading-spinner loading-xs" /> : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
