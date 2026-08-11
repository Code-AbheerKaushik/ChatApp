import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  isGroupsLoading: false,
  isGroupMessagesLoading: false,
  groupMessages: [],
  createGroupModalOpen: false,
  groupSettingsModalOpen: false,

  setCreateGroupModalOpen: (open) => set({ createGroupModalOpen: open }),
  setGroupSettingsModalOpen: (open) => set({ groupSettingsModalOpen: open }),
  setSelectedGroup: (group) => set({ selectedGroup: group, groupMessages: [] }),

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({
        groups: [res.data, ...state.groups],
        selectedGroup: res.data,
        createGroupModalOpen: false,
      }));
      toast.success("Group created successfully!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create group");
      throw error;
    }
  },

  updateGroup: async (groupId, updateData) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, updateData);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Group updated!");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update group");
      throw error;
    }
  },

  addGroupMembers: async (groupId, memberIds) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { memberIds });
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Members added!");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add members");
    }
  },

  removeGroupMember: async (groupId, userId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
      set((state) => ({
        groups: state.groups.map((g) => (g._id === groupId ? res.data : g)),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup,
      }));
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove member");
    }
  },

  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/leave`);
      set((state) => ({
        groups: state.groups.filter((g) => g._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
        groupSettingsModalOpen: false,
      }));
      toast.success("Left group");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to leave group");
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (error) {
      console.error("Error loading group messages:", error);
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (groupId, messageData) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/send`, messageData);
      set((state) => ({
        groupMessages: [...state.groupMessages, res.data],
      }));
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send message");
      throw error;
    }
  },

  // Socket sync listeners
  handleGroupUpdated: (updatedGroup) => {
    set((state) => ({
      groups: state.groups.map((g) => (g._id === updatedGroup._id ? updatedGroup : g)),
      selectedGroup: state.selectedGroup?._id === updatedGroup._id ? updatedGroup : state.selectedGroup,
    }));
  },

  handleGroupMemberRemoved: ({ groupId, userId }) => {
    const currentUserId = useGroupStore.getState().currentUserId; // injected or checked
    set((state) => ({
      groups: state.groups.filter((g) => g._id !== groupId),
      selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup,
    }));
  },

  handleGroupMessageExpired: ({ groupId, messageId }) => {
    set((state) => ({
      groupMessages: state.groupMessages.filter((m) => m._id !== messageId),
    }));
  },
}));
