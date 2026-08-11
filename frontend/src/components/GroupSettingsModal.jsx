import { useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Shield, Clock, UserPlus, LogOut, Trash2, X, Crown, Camera } from "lucide-react";
import toast from "react-hot-toast";

const DISAPPEARING_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "90 days", value: 7776000 },
];

const GroupSettingsModal = () => {
  const { selectedGroup, groupSettingsModalOpen, setGroupSettingsModalOpen, updateGroup, removeGroupMember, leaveGroup, addGroupMembers } = useGroupStore();
  const { authUser } = useAuthStore();
  const { users } = useChatStore();

  const [name, setName] = useState(selectedGroup?.name || "");
  const [description, setDescription] = useState(selectedGroup?.description || "");
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);

  if (!groupSettingsModalOpen || !selectedGroup) return null;

  const isAdmin = selectedGroup.admins?.some((a) => String(a._id || a) === String(authUser._id));
  const isCreator = String(selectedGroup.creatorId?._id || selectedGroup.creatorId) === String(authUser._id);

  const handleUpdateDuration = async (val) => {
    if (!isAdmin) return toast.error("Only group admins can update disappearing messages");
    await updateGroup(selectedGroup._id, { disappearingDuration: val });
  };

  const handleAddMembersSubmit = async () => {
    if (!selectedNewMembers.length) return;
    await addGroupMembers(selectedGroup._id, selectedNewMembers);
    setShowAddMembers(false);
    setSelectedNewMembers([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setGroupSettingsModalOpen(false)}>
      <div className="bg-base-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex items-center justify-between">
          <h3 className="font-bold text-base">Group Info & Settings</h3>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={() => setGroupSettingsModalOpen(false)}>
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1 messages-scrollbar">
          {/* Header Profile Info */}
          <div className="flex flex-col items-center gap-2 text-center">
            <img src={selectedGroup.groupPic || "/avatar.png"} alt={selectedGroup.name} className="size-20 rounded-full object-cover border-2 border-primary" />
            <div>
              <h4 className="font-bold text-lg">{selectedGroup.name}</h4>
              <p className="text-xs text-base-content/60">{selectedGroup.members?.length || 0} members</p>
            </div>
          </div>

          {/* Disappearing Messages Section */}
          <div className="bg-base-200/60 rounded-2xl p-3 space-y-2 border border-base-300/60">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Clock className="size-4 text-primary" /> Disappearing Messages Timer
            </div>
            <p className="text-[11px] text-base-content/60">
              When turned on, new messages sent in this group will automatically disappear after the set duration.
            </p>
            <div className="grid grid-cols-4 gap-1 pt-1">
              {DISAPPEARING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  disabled={!isAdmin}
                  onClick={() => handleUpdateDuration(opt.value)}
                  className={`btn btn-xs rounded-xl ${
                    selectedGroup.disappearingDuration === opt.value ? "btn-primary font-bold" : "btn-ghost bg-base-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Members List Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Members</span>
              {isAdmin && (
                <button onClick={() => setShowAddMembers(!showAddMembers)} className="btn btn-ghost btn-xs text-primary gap-1">
                  <UserPlus className="size-3.5" /> Add Member
                </button>
              )}
            </div>

            {/* Add member sub-view */}
            {showAddMembers && (
              <div className="p-2 border border-primary/30 bg-primary/5 rounded-2xl space-y-2">
                <div className="max-h-32 overflow-y-auto space-y-1 messages-scrollbar">
                  {users
                    .filter((u) => !selectedGroup.members?.some((m) => String(m.userId?._id || m.userId) === String(u._id)))
                    .map((u) => (
                      <label key={u._id} className="flex items-center justify-between p-1.5 hover:bg-base-200 rounded-lg cursor-pointer text-xs">
                        <span>{u.fullName}</span>
                        <input
                          type="checkbox"
                          checked={selectedNewMembers.includes(u._id)}
                          onChange={() =>
                            setSelectedNewMembers((prev) =>
                              prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id]
                            )
                          }
                          className="checkbox checkbox-xs checkbox-primary"
                        />
                      </label>
                    ))}
                </div>
                <button onClick={handleAddMembersSubmit} className="btn btn-primary btn-xs w-full">Confirm Add</button>
              </div>
            )}

            {/* Members scroll list */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto messages-scrollbar border border-base-300 rounded-2xl p-2">
              {selectedGroup.members?.map((m) => {
                const user = m.userId || {};
                const isMemberAdmin = selectedGroup.admins?.some((a) => String(a._id || a) === String(user._id));
                const isSelf = String(user._id) === String(authUser._id);

                return (
                  <div key={user._id} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-base-200 transition-colors text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={user.profilePic || "/avatar.png"} className="size-7 rounded-full object-cover" />
                      <span className="font-medium truncate">{user.fullName} {isSelf && "(You)"}</span>
                      {isMemberAdmin && <Crown className="size-3 text-warning flex-shrink-0" title="Admin" />}
                    </div>
                    {isAdmin && !isSelf && (
                      <button onClick={() => removeGroupMember(selectedGroup._id, user._id)} className="btn btn-ghost btn-xs btn-circle text-error" title="Remove member">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-base-300">
            <button onClick={() => leaveGroup(selectedGroup._id)} className="btn btn-outline btn-error btn-sm w-full rounded-xl gap-2">
              <LogOut className="size-4" /> Leave Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupSettingsModal;
