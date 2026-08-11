import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// ── User → Socket mapping ────────────────────────────────────────────────────
// Stores a Set of socket IDs per user to support multi-device connections.
// { userId: Set<socketId> }
const userSocketMap = {};

/**
 * Get all active socket IDs for a user (multi-device safe).
 * Returns an array (may be empty).
 */
export function getReceiverSocketIds(userId) {
  const key = String(userId);
  const ids = userSocketMap[key];
  return ids ? Array.from(ids) : [];
}

/**
 * @deprecated Use getReceiverSocketIds instead.
 * Kept for backwards-compat with any code that hasn't been migrated yet.
 * Returns the first socket ID for the user, or undefined.
 */
export function getReceiverSocketId(userId) {
  const ids = getReceiverSocketIds(userId);
  return ids[0];
}

/**
 * Emit an event to ALL active sockets of a user (all devices/tabs).
 */
function emitToUser(userId, event, data) {
  const socketIds = getReceiverSocketIds(userId);
  for (const sid of socketIds) {
    io.to(sid).emit(event, data);
  }
}

io.on("connection", async (socket) => {
  console.log("A user connected", socket.id);

  const userId = String(socket.handshake.query.userId || "");

  if (userId) {
    // Register this socket under the user's ID (multi-device: add to Set)
    if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
    userSocketMap[userId].add(socket.id);

    try {
      // Mark any "sent" messages addressed to this user as "delivered" on reconnect
      const pendingMessages = await Message.find({
        receiverId: userId,
        status: "sent",
      }).select("_id senderId").lean();

      if (pendingMessages.length > 0) {
        const messageIds = pendingMessages.map((m) => m._id);
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { status: "delivered", deliveredAt: new Date() } }
        );

        // Notify each sender that their messages were delivered
        const senderGroups = pendingMessages.reduce((acc, m) => {
          const sId = String(m.senderId);
          acc[sId] = acc[sId] || [];
          acc[sId].push(m._id);
          return acc;
        }, {});

        for (const [senderId, ids] of Object.entries(senderGroups)) {
          emitToUser(senderId, "messagesDelivered", {
            receiverId: userId,
            messageIds: ids,
          });
        }
      }
    } catch (err) {
      console.error("Error updating delivery status on connection:", err.message);
    }
  }

  // Broadcast updated online user list (only users with at least one socket)
  io.emit("getOnlineUsers", Object.keys(userSocketMap).filter(uid => userSocketMap[uid]?.size > 0));

  // ── Join group rooms ────────────────────────────────────────────────────────
  socket.on("joinGroup", (groupId) => {
    if (groupId) socket.join(`group_${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    if (groupId) socket.leave(`group_${groupId}`);
  });

  // ── Delivery acknowledgement from recipient client ──────────────────────────
  // When the PC/mobile client receives a newMessage event, it emits this back.
  // We update DB status and notify the original sender (phone) of ✓✓ delivery.
  socket.on("messageDelivered", async ({ messageId, senderId }) => {
    if (!messageId || !senderId) return;
    try {
      const updated = await Message.findOneAndUpdate(
        { _id: messageId, status: "sent" },   // Only update if still "sent"
        { $set: { status: "delivered", deliveredAt: new Date() } },
        { new: true }
      );
      if (updated) {
        // Notify the sender (phone) that the message was delivered on recipient device
        emitToUser(String(senderId), "messagesDelivered", {
          receiverId: userId,
          messageIds: [updated._id],
        });
      }
    } catch (err) {
      console.error("Error handling messageDelivered ack:", err.message);
    }
  });

  // ── Typing Events with privacy check ───────────────────────────────────────
  socket.on("typing", async ({ receiverId }) => {
    try {
      const sender = await User.findById(userId).select("privacy").lean();
      if (sender?.privacy?.typingIndicator === false) return;
      emitToUser(receiverId, "typing", { senderId: userId });
    } catch (err) {
      console.error("Error in typing event:", err.message);
    }
  });

  socket.on("stopTyping", async ({ receiverId }) => {
    try {
      const sender = await User.findById(userId).select("privacy").lean();
      if (sender?.privacy?.typingIndicator === false) return;
      emitToUser(receiverId, "stopTyping", { senderId: userId });
    } catch (err) {
      console.error("Error in stopTyping event:", err.message);
    }
  });

  // ── Read Receipts with privacy check ───────────────────────────────────────
  socket.on("messageRead", async ({ senderId, messageId }) => {
    try {
      const reader = await User.findById(userId).select("privacy").lean();
      if (reader?.privacy?.readReceipts === false) return;
      emitToUser(senderId, "messageRead", { readBy: userId, messageId });
    } catch (err) {
      console.error("Error in messageRead event:", err.message);
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    if (userId && userSocketMap[userId]) {
      // Only remove this specific socket — other devices remain connected
      userSocketMap[userId].delete(socket.id);
      if (userSocketMap[userId].size === 0) {
        delete userSocketMap[userId];
        // User has fully gone offline — update lastSeen and broadcast presence
        const disconnectTime = new Date();
        try {
          await User.findByIdAndUpdate(userId, { lastSeen: disconnectTime });
          io.emit("userOffline", { userId, lastSeen: disconnectTime });
        } catch (err) {
          console.error("Error saving lastSeen on disconnect:", err.message);
        }
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap).filter(uid => userSocketMap[uid]?.size > 0));
  });
});

export { io, app, server };
