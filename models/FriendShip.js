const mongoose = require("mongoose");

const friendShipSchema = new mongoose.Schema(
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
    status: {
      type: String,
      require: true,
      enum: ["requested", "accepted", "declined", "blocked"],
    },
  },
  {
    timestamps: true,
  }
);

const FriendShip = new mongoose.model("FriendShip", friendShipSchema);

module.exports = FriendShip;
