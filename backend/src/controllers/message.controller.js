import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { sendPushNotificationToUser } from "../lib/pushNotification.js";

const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "audio/webm", "audio/mpeg", "audio/ogg", "application/pdf", "text/plain"]);

const sniffMedia = (dataUrl) => {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid file data");
  const declaredMime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_MEDIA_BYTES) throw new Error("File exceeds the 20 MB limit");
  const signature = buffer.subarray(0, 16);
  const is = (hex) => signature.subarray(0, hex.length / 2).toString("hex") === hex;
  let detected;
  if (is("ffd8ff")) detected = "image/jpeg";
  else if (is("89504e470d0a1a0a")) detected = "image/png";
  else if (signature.subarray(0, 4).toString() === "RIFF" && signature.subarray(8, 12).toString() === "WEBP") detected = "image/webp";
  else if (signature.subarray(0, 6).toString() === "GIF87a" || signature.subarray(0, 6).toString() === "GIF89a") detected = "image/gif";
  else if (signature.subarray(4, 8).toString() === "ftyp") detected = "video/mp4";
  else if (signature.subarray(0, 4).toString() === "\x1A\x45\xDF\xA3") detected = declaredMime === "audio/webm" ? "audio/webm" : "video/webm";
  else if (is("25504446")) detected = "application/pdf";
  else if (is("494433") || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) detected = "audio/mpeg";
  else if (signature.subarray(0, 4).toString() === "OggS") detected = "audio/ogg";
  else if (declaredMime === "text/plain") detected = "text/plain";
  if (!detected || detected !== declaredMime || !ALLOWED_TYPES.has(detected)) throw new Error("Unsupported or mismatched file type");
  return { mimeType: detected, size: buffer.length };
};

const mediaKind = (mimeType) => mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : mimeType.startsWith("audio/") ? "audio" : "document";
const serializeMessage = (message) => {
  const plain = message.toObject ? message.toObject() : message;
  if (plain.media?.length) plain.media = plain.media.map((media) => ({ ...media, accessUrl: `/api/messages/media/${plain._id}/${media._id}` }));
  return plain;
};

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

    // 2. Fetch the conversation messages (filtering out expired disappearing messages)
    const now = new Date();
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      $and: [
        {
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
          ]
        }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("replyTo");

    res.status(200).json(messages.map(serializeMessage));
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file, fileType, media = [], replyTo, clientMessageId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Idempotency check: if message with this clientMessageId already exists, return it directly
    if (clientMessageId) {
      const existingMessage = await Message.findOne({ senderId, clientMessageId }).populate("replyTo");
      if (existingMessage) {
        return res.status(200).json(existingMessage);
      }
    }

    if (!text?.trim() && !image && !file && !media.length) return res.status(400).json({ error: "A message needs text or media" });
    if (!Array.isArray(media) || media.length > 10) return res.status(400).json({ error: "Send up to 10 files at once" });
    const uploadedMedia = [];
    for (const item of media) {
      const inspected = sniffMedia(item.data);
      const kind = mediaKind(inspected.mimeType);
      const result = await cloudinary.uploader.upload(item.data, { resource_type: kind === "document" ? "raw" : kind === "audio" ? "video" : kind, type: "authenticated", filename_override: String(item.name || "attachment").slice(0, 160) });
      uploadedMedia.push({ publicId: result.public_id, resourceType: result.resource_type, kind, fileName: String(item.name || "attachment").slice(0, 160), mimeType: inspected.mimeType, size: result.bytes || inspected.size, width: result.width, height: result.height, duration: result.duration, format: result.format });
    }
    let imageUrl;
    if (image) {
      const inspected = sniffMedia(image);
      if (!inspected.mimeType.startsWith("image/")) return res.status(400).json({ error: "Invalid image" });
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let fileUrl;
    if (file) {
      sniffMedia(file);
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
      media: uploadedMedia,
      replyTo: replyTo || null,
      clientMessageId: clientMessageId || null,
      status: initialStatus,
      deliveredAt,
    });

    await newMessage.save();

    // Populate replyTo for realtime message delivery
    const populatedMessage = serializeMessage(await Message.findById(newMessage._id).populate("replyTo"));

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }

    // Trigger Web Push notification asynchronously for receiver
    sendPushNotificationToUser(receiverId, {
      title: req.user.fullName || "New Message",
      body: text?.trim() ? text.trim() : uploadedMedia.length ? "Sent an attachment 📎" : "Sent a message 💬",
      icon: req.user.profilePic || "/avatar.png",
      data: {
        url: "/",
        conversationId: String(senderId),
        messageId: String(newMessage._id),
      },
    }).catch((err) => console.error("Push notify error:", err));

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Global-search navigation gets only a small window around the result.
export const getMessageContext = async (req, res) => {
  try {
    const userId = req.user._id;
    const target = await Message.findOne({ _id: req.params.id, $or: [{ senderId: userId }, { receiverId: userId }] });
    if (!target) return res.status(404).json({ error: "Message not found" });
    const peerId = String(target.senderId) === String(userId) ? target.receiverId : target.senderId;
    const conversation = { $or: [{ senderId: userId, receiverId: peerId }, { senderId: peerId, receiverId: userId }] };
    const [before, after] = await Promise.all([
      Message.find({ $and: [conversation, { createdAt: { $lt: target.createdAt } }] }).sort({ createdAt: -1 }).limit(25).populate("replyTo"),
      Message.find({ $and: [conversation, { createdAt: { $gte: target.createdAt } }] }).sort({ createdAt: 1 }).limit(26).populate("replyTo"),
    ]);
    res.json({ targetId: target._id, messages: [...before.reverse(), ...after].map(serializeMessage) });
  } catch (error) {
    console.error("Error loading message context:", error.message);
    res.status(500).json({ error: "Could not load message context" });
  }
};

export const streamMedia = async (req, res) => {
  try {
    const message = await Message.findOne({ _id: req.params.messageId, $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] });
    if (!message) return res.status(404).json({ error: "Media not found" });
    const media = message.media.id(req.params.mediaId);
    if (!media) return res.status(404).json({ error: "Media not found" });
    const url = cloudinary.url(media.publicId, { resource_type: media.resourceType, type: "authenticated", sign_url: true, secure: true });
    res.redirect(302, url);
  } catch (error) { res.status(500).json({ error: "Unable to load media" }); }
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
        fileType: original.fileType, media: original.media?.map((media) => ({ ...media.toObject(), _id: undefined })) || [], clientMessageId: key,
        forwardedFrom: { messageId: original._id, senderId: original.senderId, forwardedAt: new Date() },
        status: receiverSocketId ? "delivered" : "sent", deliveredAt: receiverSocketId ? new Date() : undefined,
      });
      const populated = serializeMessage(await Message.findById(message._id).populate("replyTo"));
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

    const message = await Message.findOne({ _id: messageId, $or: [{ senderId: userId }, { receiverId: userId }] });
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

    const message = await Message.findOne({ _id: messageId, $or: [{ senderId: req.user._id }, { receiverId: req.user._id }] });
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
