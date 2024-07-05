const mongoose = require("mongoose");

const GroupUserRelationSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Types.ObjectId,
      ref: "GroupConversation",
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    role: {
      type: String,
      require: true,
      enum: ["admin", "normalUser"],
    },
    status: {
      type: String,
      require: true,
      enum: ["joined", "left", "banned"],
    },
  },
  {
    timestamps: true,
  }
);

const GroupUserRelation = new mongoose.model(
  "GroupUserRelation",
  GroupUserRelationSchema
);

module.exports = GroupUserRelation;
