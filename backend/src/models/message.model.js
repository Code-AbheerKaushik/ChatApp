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
      required: true,
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
      type: String, // "image" | "audio" | "video" | "document" | "location" | "sticker"
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // New uploads use this collection. Legacy image/file fields remain supported.
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

// Optimize query performance for unread count, global search, and conversations
messageSchema.index({ receiverId: 1, status: 1 });
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, receiverId: 1, text: "text" });
messageSchema.index({ starredBy: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
