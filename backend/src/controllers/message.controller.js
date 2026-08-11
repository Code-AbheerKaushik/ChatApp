import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    const usersWithLastMessage = await Promise.all(
      filteredUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        }).sort({ createdAt: -1 });

        // Count unread messages from this user to the logged-in user
        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          status: { $ne: "read" },
        });

        return {
          ...user.toObject(),
          lastMessage: lastMessage || null,
          unreadCount,
        };
      })
    );

    // Sort: conversations with messages first, ordered by most recent message
    usersWithLastMessage.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.status(200).json(usersWithLastMessage);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // 1. Automatically mark unread messages from this sender to me as read
    const unreadMessages = await Message.find({
      senderId: userToChatId,
      receiverId: myId,
      status: { $ne: "read" },
    }).select("_id");

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((m) => m._id);
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $set: { status: "read", readAt: new Date() } }
      );

      // Notify the sender that their messages have been read
      const senderSocketId = getReceiverSocketId(userToChatId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", {
          readBy: myId,
          messageIds,
        });
      }
    }

    // 2. Fetch the conversation messages
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("replyTo");

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, fileType, replyTo, clientMessageId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Idempotency check: if message with this clientMessageId already exists, return it directly
    if (clientMessageId) {
      const existingMessage = await Message.findOne({ senderId, clientMessageId }).populate("replyTo");
      if (existingMessage) {
        return res.status(200).json(existingMessage);
      }
    }

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let fileUrl;
    if (file) {
      // Upload raw base64 (audio/video/document) to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: "auto",
      });
      fileUrl = uploadResponse.secure_url;
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    const initialStatus = receiverSocketId ? "delivered" : "sent";
    const deliveredAt = receiverSocketId ? new Date() : undefined;

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      file: fileUrl,
      fileType,
      replyTo: replyTo || null,
      clientMessageId: clientMessageId || null,
      status: initialStatus,
      deliveredAt,
    });

    await newMessage.save();

    // Populate replyTo for realtime message delivery
    const populatedMessage = await Message.findById(newMessage._id).populate("replyTo");

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { recipientIds, clientForwardId } = req.body;
    const senderId = req.user._id;
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: "Choose at least one conversation" });
    }
    const original = await Message.findOne({ _id: messageId, $or: [{ senderId }, { receiverId: senderId }] });
    if (!original) return res.status(404).json({ error: "Message not found" });
    const uniqueRecipients = [...new Set(recipientIds.map(String))].filter((id) => id !== String(senderId));
    const allowed = await User.find({ _id: { $in: uniqueRecipients } }).select("_id");
    if (allowed.length !== uniqueRecipients.length) return res.status(403).json({ error: "One or more conversations are unavailable" });

    const results = await Promise.all(uniqueRecipients.map(async (receiverId) => {
      const key = clientForwardId ? `${clientForwardId}:${receiverId}` : null;
      if (key) {
        const existing = await Message.findOne({ senderId, clientMessageId: key }).populate("replyTo");
        if (existing) return existing;
      }
      const receiverSocketId = getReceiverSocketId(receiverId);
      const message = await Message.create({
        senderId, receiverId, text: original.text, image: original.image, file: original.file,
        fileType: original.fileType, clientMessageId: key,
        forwardedFrom: { messageId: original._id, senderId: original.senderId, forwardedAt: new Date() },
        status: receiverSocketId ? "delivered" : "sent", deliveredAt: receiverSocketId ? new Date() : undefined,
      });
      const populated = await Message.findById(message._id).populate("replyTo");
      if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", populated);
      return populated;
    }));
    res.status(201).json(results);
  } catch (error) {
    console.error("Error forwarding message:", error.message);
    res.status(500).json({ error: "Could not forward message" });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const query = String(req.query.q || "").trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    if (query.length < 2) return res.json({ results: [], page, hasMore: false });
    const filter = { $and: [
      { $or: [{ senderId: userId }, { receiverId: userId }] },
      { $text: { $search: query } },
    ] };
    const rows = await Message.find(filter, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" }, createdAt: -1 })
      .skip((page - 1) * limit).limit(limit + 1)
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic")
      .lean();
    const hasMore = rows.length > limit;
    res.json({ results: rows.slice(0, limit), page, hasMore });
  } catch (error) {
    console.error("Error searching messages:", error.message);
    res.status(500).json({ error: "Could not search messages" });
  }
};

export const toggleStarMessage = async (req, res) => {
  try {
    const message = await Message.findOne({ _id: req.params.id, $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] });
    if (!message) return res.status(404).json({ error: "Message not found" });
    const id = String(req.user._id);
    const index = message.starredBy.findIndex((starredId) => String(starredId) === id);
    if (index >= 0) message.starredBy.splice(index, 1); else message.starredBy.push(req.user._id);
    await message.save();
    const populated = await Message.findById(message._id).populate("replyTo");
    res.json(populated);
  } catch (error) { res.status(500).json({ error: "Could not update star" }); }
};

export const getStarredMessages = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
    const rows = await Message.find({ starredBy: req.user._id }).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit + 1)
      .populate("senderId", "fullName profilePic").populate("receiverId", "fullName profilePic").lean();
    res.json({ results: rows.slice(0, limit), page, hasMore: rows.length > limit });
  } catch (error) { res.status(500).json({ error: "Could not load saved messages" }); }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, senderId: userId });
    if (!message) {
      return res.status(404).json({ error: "Message not found or unauthorized" });
    }

    message.text = text;
    message.edited = true;
    await message.save();

    const populatedMessage = await Message.findById(message._id).populate("replyTo");

    // Broadcast change
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", populatedMessage);
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.log("Error in editMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Message.findByIdAndDelete(messageId);

    // Broadcast deletion
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }

    res.status(200).json({ message: "Message deleted successfully", messageId });
  } catch (error) {
    console.log("Error in deleteMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user already reacted with this emoji
    const existingReactionIdx = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIdx > -1) {
      if (message.reactions[existingReactionIdx].emoji === emoji) {
        // Toggle off reaction if it's the exact same emoji
        message.reactions.splice(existingReactionIdx, 1);
      } else {
        // Update emoji
        message.reactions[existingReactionIdx].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id).populate("replyTo");

    // Broadcast reaction
    const otherUserId = message.senderId.toString() === userId.toString() ? message.receiverId : message.senderId;
    const receiverSocketId = getReceiverSocketId(otherUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageReaction", populatedMessage);
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.log("Error in reactToMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const togglePinMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    message.isPinned = !message.isPinned;
    await message.save();

    const populatedMessage = await Message.findById(message._id).populate("replyTo");

    const otherUserId = message.senderId.toString() === req.user._id.toString() ? message.receiverId : message.senderId;
    const receiverSocketId = getReceiverSocketId(otherUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messagePinned", populatedMessage);
    }

    res.status(200).json(populatedMessage);
  } catch (error) {
    console.log("Error in togglePinMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markConversationAsRead = async (req, res) => {
  try {
    const { senderId } = req.params; // The user whose messages we are marking as read
    const myId = req.user._id;

    const unreadMessages = await Message.find({
      senderId,
      receiverId: myId,
      status: { $ne: "read" },
    }).select("_id");

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((m) => m._id);
      await Message.updateMany(
        { _id: { $in: messageIds } },
        { $set: { status: "read", readAt: new Date() } }
      );

      // Notify the sender
      const senderSocketId = getReceiverSocketId(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagesRead", {
          readBy: myId,
          messageIds,
        });
      }
    }

    res.status(200).json({ success: true, count: unreadMessages.length });
  } catch (error) {
    console.log("Error in markConversationAsRead: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
