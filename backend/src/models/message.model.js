import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
      index: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    file: {
      type: String,
    },
    fileType: {
      type: String,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    media: [{
      publicId: { type: String, required: true },
      resourceType: { type: String, enum: ["image", "video", "raw"], required: true },
      kind: { type: String, enum: ["image", "video", "audio", "document"], required: true },
      fileName: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true },
      width: Number,
      height: Number,
      duration: Number,
      format: String,
    }],
    forwardedFrom: {
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      forwardedAt: { type: Date },
    },
    starredBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
    // Multi-participant receipt tracking for group messages
    deliveredTo: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deliveredAt: { type: Date, default: Date.now },
      },
    ],
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    // Disappearing messages support
    disappearingDuration: {
      type: Number,
      default: 0, // 0 = off, 86400 = 24h, 604800 = 7d, 7776000 = 90d
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    clientMessageId: {
      type: String,
      index: true,
    },
    edited: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    deliveredAt: {
      type: Date,
    },
    readAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
messageSchema.index({ receiverId: 1, status: 1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, text: "text" });
messageSchema.index({ starredBy: 1, createdAt: -1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL index

const Message = mongoose.model("Message", messageSchema);

export default Message;
