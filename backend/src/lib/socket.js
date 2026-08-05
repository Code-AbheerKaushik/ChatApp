import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

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

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

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

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
