import Group from "../models/group.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const serializeMessage = (message) => {
  const plain = message.toObject ? message.toObject() : message;
  if (plain.media?.length) {
    plain.media = plain.media.map((media) => ({
      ...media,
      accessUrl: `/api/messages/media/${plain._id}/${media._id}`,
    }));
  }
  return plain;
};

// Create Group
export const createGroup = async (req, res) => {
  try {
    const { name, description, memberIds, groupPic, disappearingDuration } = req.body;
    const creatorId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const uniqueMembers = Array.from(new Set([...(memberIds || []), String(creatorId)]));
    if (uniqueMembers.length < 2) {
      return res.status(400).json({ error: "Group must have at least 2 participants" });
    }

    let uploadedGroupPic = "";
    if (groupPic && groupPic.startsWith("data:image/")) {
      const uploadRes = await cloudinary.uploader.upload(groupPic);
      uploadedGroupPic = uploadRes.secure_url;
    }

    const memberObjects = uniqueMembers.map((id) => ({
      userId: id,
      joinedAt: new Date(),
    }));

    const newGroup = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      groupPic: uploadedGroupPic,
      creatorId,
      admins: [creatorId],
      members: memberObjects,
      disappearingDuration: Number(disappearingDuration) || 0,
    });

    await newGroup.save();

    const populatedGroup = await Group.findById(newGroup._id)
      .populate("members.userId", "fullName profilePic username")
      .populate("admins", "fullName profilePic username")
      .populate("creatorId", "fullName profilePic username");

    // Notify all online group members via socket
    uniqueMembers.forEach((memberId) => {
      const socketId = getReceiverSocketId(memberId);
      if (socketId) {
        io.to(socketId).emit("newGroupCreated", populatedGroup);
      }
    });

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup controller:", error.message);
    res.status(500).json({ error: "Could not create group" });
  }
};

// Get User Groups
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ "members.userId": userId })
      .populate("members.userId", "fullName profilePic username")
      .populate("admins", "fullName profilePic username")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getUserGroups controller:", error.message);
    res.status(500).json({ error: "Could not fetch groups" });
  }
};

// Get Group Details
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({ _id: groupId, "members.userId": userId })
      .populate("members.userId", "fullName profilePic username")
      .populate("admins", "fullName profilePic username")
      .populate("creatorId", "fullName profilePic username");

    if (!group) {
      return res.status(404).json({ error: "Group not found or unauthorized" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in getGroupDetails controller:", error.message);
    res.status(500).json({ error: "Could not fetch group details" });
  }
};

// Update Group Metadata / Disappearing duration (Admins only)
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, groupPic, disappearingDuration } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Server-side Admin Authorization check
    const isAdmin = group.admins.some((id) => String(id) === String(userId));
    if (!isAdmin) {
      return res.status(403).json({ error: "Only admins can update group settings" });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description.trim();
    if (disappearingDuration !== undefined) group.disappearingDuration = Number(disappearingDuration);

    if (groupPic && groupPic.startsWith("data:image/")) {
      const uploadRes = await cloudinary.uploader.upload(groupPic);
      group.groupPic = uploadRes.secure_url;
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.userId", "fullName profilePic username")
      .populate("admins", "fullName profilePic username");

    // Notify all members in room
    group.members.forEach((m) => {
      const socketId = getReceiverSocketId(m.userId);
      if (socketId) {
        io.to(socketId).emit("groupUpdated", updatedGroup);
      }
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in updateGroup controller:", error.message);
    res.status(500).json({ error: "Could not update group" });
  }
};

// Add Members (Admins only)
export const addGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.admins.some((id) => String(id) === String(userId));
    if (!isAdmin) {
      return res.status(403).json({ error: "Only admins can add members" });
    }

    const currentMemberIds = new Set(group.members.map((m) => String(m.userId)));
    (memberIds || []).forEach((id) => {
      if (!currentMemberIds.has(String(id))) {
        group.members.push({ userId: id, joinedAt: new Date() });
      }
    });

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.userId", "fullName profilePic username")
      .populate("admins", "fullName profilePic username");

    group.members.forEach((m) => {
      const socketId = getReceiverSocketId(m.userId);
      if (socketId) io.to(socketId).emit("groupUpdated", updatedGroup);
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in addGroupMembers:", error.message);
    res.status(500).json({ error: "Could not add members" });
  }
};

// Remove Member (Admins only)
export const removeGroupMember = async (req, res) => {
  try {
    const { groupId, userId: targetUserId } = req.params;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isAdmin = group.admins.some((id) => String(id) === String(adminId));
    if (!isAdmin) {
      return res.status(403).json({ error: "Only admins can remove members" });
    }

    group.members = group.members.filter((m) => String(m.userId) !== String(targetUserId));
    group.admins = group.admins.filter((id) => String(id) !== String(targetUserId));

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.userId", "fullName profilePic username")
      .populate("admins", "fullName profilePic username");

    // Notify removed user and remaining group members
    const removedSocketId = getReceiverSocketId(targetUserId);
    if (removedSocketId) io.to(removedSocketId).emit("groupMemberRemoved", { groupId, userId: targetUserId });

    group.members.forEach((m) => {
      const socketId = getReceiverSocketId(m.userId);
      if (socketId) io.to(socketId).emit("groupUpdated", updatedGroup);
    });

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error("Error in removeGroupMember:", error.message);
    res.status(500).json({ error: "Could not remove member" });
  }
};

// Leave Group
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    group.members = group.members.filter((m) => String(m.userId) !== String(userId));
    group.admins = group.admins.filter((id) => String(id) !== String(userId));

    // If no admins left but group still has members, promote creator or first member
    if (group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0].userId);
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.userId", "fullName profilePic username")
      .populate("admins", "fullName profilePic username");

    group.members.forEach((m) => {
      const socketId = getReceiverSocketId(m.userId);
      if (socketId) io.to(socketId).emit("groupUpdated", updatedGroup);
    });

    res.status(200).json({ success: true, message: "Left group successfully" });
  } catch (error) {
    console.error("Error in leaveGroup:", error.message);
    res.status(500).json({ error: "Could not leave group" });
  }
};

// Get Group Messages (filtering out expired disappearing messages)
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({ _id: groupId, "members.userId": userId });
    if (!group) return res.status(403).json({ error: "Unauthorized access to group chat" });

    const now = new Date();
    const messages = await Message.find({
      groupId,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullName profilePic username")
      .populate("replyTo");

    res.status(200).json(messages.map(serializeMessage));
  } catch (error) {
    console.error("Error in getGroupMessages:", error.message);
    res.status(500).json({ error: "Could not fetch group messages" });
  }
};

// Send Group Message
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image, file, fileType, media = [], replyTo, clientMessageId } = req.body;
    const senderId = req.user._id;

    const group = await Group.findOne({ _id: groupId, "members.userId": senderId });
    if (!group) return res.status(403).json({ error: "Not a member of this group" });

    // Compute Disappearing Expiration if set on group
    const disappearingDuration = group.disappearingDuration || 0;
    const expiresAt = disappearingDuration > 0 ? new Date(Date.now() + disappearingDuration * 1000) : null;

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image,
      file,
      fileType,
      media,
      replyTo: replyTo || null,
      clientMessageId: clientMessageId || null,
      disappearingDuration,
      expiresAt,
      deliveredTo: [{ userId: senderId, deliveredAt: new Date() }],
      readBy: [{ userId: senderId, readAt: new Date() }],
    });

    await newMessage.save();

    group.lastMessage = newMessage._id;
    await group.save();

    const populatedMsg = serializeMessage(
      await Message.findById(newMessage._id)
        .populate("senderId", "fullName profilePic username")
        .populate("replyTo")
    );

    // Broadcast to all active online group members
    group.members.forEach((m) => {
      const socketId = getReceiverSocketId(m.userId);
      if (socketId) {
        io.to(socketId).emit("newGroupMessage", { groupId, message: populatedMsg });
      }
    });

    res.status(201).json(populatedMsg);
  } catch (error) {
    console.error("Error in sendGroupMessage:", error.message);
    res.status(500).json({ error: "Could not send group message" });
  }
};
