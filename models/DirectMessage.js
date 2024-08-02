const mongoose = require("mongoose");
const Attachment = require("./Attachment");

const DirectMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Types.ObjectId,
      ref: "DirectConversation",
      require: true,
    },
    to: {
      type: mongoose.Types.ObjectId,
      ref: "User",
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
      ref: "DirectMessage",
    },
    text: {
      type: String,
    },
    files: [Attachment],
    //a talk often last for a period time, is this msg is start msg of period
    isStartMsg: {
      type: Boolean,
    },
    isDeleted: { type: Boolean, defaults: false },
    unread: {
      type: Boolean,
      default: true,
    },
    sentSuccess: {
      type: String,
      enum: ["unset", "error", "success"],
      default: "unset",
      require: true,
    },
  },
  {
    timestamps: true,
  }
);

const DirectMessage = new mongoose.model("DirectMessage", DirectMessageSchema);

module.exports = DirectMessage;
