const mongoose = require("mongoose");

const joinGroupRequestSchema = new mongoose.Schema(
  {
    senderId: {
      require: true,
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    recipientId: {
      require: true,
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    groupId: {
      type: mongoose.Types.ObjectId,
      ref: "GroupConversation",
    },
    status: {
      type: String,
      require: true,
      enum: ["requested", "accepted", "declined"],
    },
  },
  {
    timestamps: true,
  }
);

const JoinGroupRequest = new mongoose.model(
  "JoinGroupRequest",
  joinGroupRequestSchema
);

module.exports = JoinGroupRequest;
