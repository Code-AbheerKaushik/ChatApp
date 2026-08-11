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

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", async (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;

    try {
      // 1. Mark any pending "sent" messages to this user as "delivered"
      const pendingMessages = await Message.find({
        receiverId: userId,
        status: "sent",
      }).select("_id senderId");

      if (pendingMessages.length > 0) {
        const messageIds = pendingMessages.map((m) => m._id);
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { status: "delivered", deliveredAt: new Date() } }
        );

        // Group by sender and notify online senders
        const senderGroups = pendingMessages.reduce((acc, m) => {
          const sId = String(m.senderId);
          acc[sId] = acc[sId] || [];
          acc[sId].push(m._id);
          return acc;
        }, {});

        for (const [senderId, ids] of Object.entries(senderGroups)) {
          const senderSocketId = userSocketMap[senderId];
          if (senderSocketId) {
            io.to(senderSocketId).emit("messagesDelivered", {
              receiverId: userId,
              messageIds: ids,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error updating delivery status on connection:", err.message);
    }
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Join group socket rooms
  socket.on("joinGroup", (groupId) => {
    if (groupId) socket.join(`group_${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    if (groupId) socket.leave(`group_${groupId}`);
  });

  // ─── Typing Events with privacy check ─────────────────────────────────────
  socket.on("typing", async ({ receiverId }) => {
    try {
      const sender = await User.findById(userId).select("privacy").lean();
      // If sender has disabled typing indicator, do not emit
      if (sender?.privacy?.typingIndicator === false) return;

      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { senderId: userId });
      }
    } catch (err) {
      console.error("Error in typing event:", err.message);
    }
  });

  socket.on("stopTyping", async ({ receiverId }) => {
    try {
      const sender = await User.findById(userId).select("privacy").lean();
      if (sender?.privacy?.typingIndicator === false) return;

      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
      }
    } catch (err) {
      console.error("Error in stopTyping event:", err.message);
    }
  });

  // ─── Read Receipts with privacy check ─────────────────────────────────────
  socket.on("messageRead", async ({ senderId, messageId }) => {
    try {
      const reader = await User.findById(userId).select("privacy").lean();
      if (reader?.privacy?.readReceipts === false) return;

      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageRead", { readBy: userId, messageId });
      }
    } catch (err) {
      console.error("Error in messageRead event:", err.message);
    }
  });

  socket.on("disconnect", async () => {
    console.log("A user disconnected", socket.id);
    if (userId) {
      delete userSocketMap[userId];
      const disconnectTime = new Date();
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: disconnectTime });
        // Emit lastSeen presence update to everyone in real-time
        io.emit("userOffline", { userId, lastSeen: disconnectTime });
      } catch (err) {
        console.error("Error saving lastSeen on disconnect:", err.message);
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
