import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    caller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    duration: {
      type: Number, // duration in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ["completed", "missed", "declined", "no-answer"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);
export default Call;
