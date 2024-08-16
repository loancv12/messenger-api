const mongoose = require("mongoose");

const GroupMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Types.ObjectId,
      ref: "GroupConversation",
      require: true,
    },
    from: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      require: true,
    },
    type: {
      type: String,
      enum: ["text", "img", "doc", "link"],
      require: true,
    },
    isReply: {
      type: Boolean,
      default: false,
    },
    replyMsgId: {
      type: mongoose.Types.ObjectId,
      ref: "GroupMessage",
    },
    text: {
      type: String,
    },
    files: [
      {
        type: String,
        default: [],
      },
    ],
    //a talk often last for a period time, is this msg is start msg of period
    isStartMsg: {
      type: Boolean,
    },
    isDeleted: { type: Boolean, defaults: false },
    readUserIds: {
      type: [
        {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
    readUserIds: {
      type: [
        {
          type: mongoose.Types.ObjectId,
          ref: "User",
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const GroupMessage = new mongoose.model("GroupMessage", GroupMessageSchema);

module.exports = GroupMessage;
