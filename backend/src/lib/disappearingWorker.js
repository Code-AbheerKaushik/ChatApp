import Message from "../models/message.model.js";
import { io } from "./socket.js";

/**
 * Periodically checks for expired disappearing messages and notifies clients in real-time before cleanup.
 */
export const startDisappearingWorker = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredMessages = await Message.find({
        expiresAt: { $ne: null, $lte: now },
      }).select("_id groupId senderId receiverId");

      if (expiredMessages.length > 0) {
        const expiredIds = expiredMessages.map((m) => m._id);

        // Group expired IDs by recipient context to broadcast socket deletion events
        expiredMessages.forEach((msg) => {
          if (msg.groupId) {
            io.emit("groupMessageExpired", { groupId: msg.groupId, messageId: msg._id });
          } else {
            io.emit("messageExpired", { messageId: msg._id, conversationId: msg.senderId });
          }
        });

        // Remove expired messages from database
        await Message.deleteMany({ _id: { $in: expiredIds } });
      }
    } catch (error) {
      console.error("Error in disappearingWorker background task:", error.message);
    }
  }, 15000); // Check every 15 seconds
};
