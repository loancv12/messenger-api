const mongoose = require("mongoose");

const DirectConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMsgCreatedTime: {
      type: Date,
      default: new Date(),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // So `res.json()` and other `JSON.stringify()` functions include virtuals
    toObject: { virtuals: true }, // So `console.log()` and other functions that use `toObject()` include virtuals
  }
);

DirectConversationSchema.virtual("messages", {
  ref: "DirectMessage",
  localField: "_id",
  foreignField: "conversationId",
  justOne: false,
});

DirectConversationSchema.virtual("numberOfMessages", {
  ref: "DirectMessage", // The model to use
  localField: "_id", // Find people where `localField`
  foreignField: "conversationId", // is equal to `foreignField`
  count: true, // And only get the number of docs
});

DirectConversationSchema.virtual("unreadMessages", {
  ref: "DirectMessage", // The model to use
  localField: "_id", // Find people where `localField`
  foreignField: "conversationId", // is equal to `foreignField`
  justOne: false,
  // need to override to get correct answer
  match: { unread: false },
});

DirectConversationSchema.virtual("lastMsg", {
  ref: "DirectMessage",
  localField: "_id",
  foreignField: "conversationId",
  justOne: true,
  match: (conversation) => ({ createdAt: conversation.lastMsgCreatedTime }),
});

DirectConversationSchema.virtual("numberOfUnreadMsgs", {
  ref: "DirectMessage",
  localField: "_id",
  foreignField: "conversationId",
  // need to override to get correct answer
  match: { unread: false },
  count: true, // And only get the number of docs
});

const DirectConversation = new mongoose.model(
  "DirectConversation",
  DirectConversationSchema
);

module.exports = DirectConversation;
