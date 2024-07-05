const mongoose = require("mongoose");

const GroupConversationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
    },
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
  }
);

GroupConversationSchema.virtual("adminId", {
  ref: "GroupUserRelation",
  localField: "_id",
  foreignField: "groupId",
  justOne: true,
  match: { role: "admin" },
});

GroupConversationSchema.virtual("messages", {
  ref: "GroupMessage",
  localField: "_id",
  foreignField: "conversationId",
  justOne: false,
});

GroupConversationSchema.virtual("numberOfMessages", {
  ref: "GroupMessage", // The model to use
  localField: "_id", // Find people where `localField`
  foreignField: "conversationId", // is equal to `foreignField`
  count: true, // And only get the number of docs
});

GroupConversationSchema.virtual("lastMsg", {
  ref: "GroupMessage",
  localField: "_id",
  foreignField: "conversationId",
  justOne: true,
  match: (conversation) => ({ createdAt: conversation.lastMsgCreatedTime }),
});

GroupConversationSchema.virtual("numberOfUnreadMsgs", {
  ref: "GroupMessage",
  localField: "_id",
  foreignField: "conversationId",
  // REMEMBER: overide to get unread msg that msg from is userId
  match: { unread: false },
  count: true, // And only get the number of docs
});

const GroupConversation = new mongoose.model(
  "GroupConversation",
  GroupConversationSchema
);

module.exports = GroupConversation;
