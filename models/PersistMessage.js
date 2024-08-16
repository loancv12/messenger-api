const mongoose = require("mongoose");

const persistMessageSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      require: true,
    },
    msgId: {
      type: mongoose.Types.ObjectId,
      required: true,
      // Instead of a hardcoded model name in `ref`, `refPath` means Mongoose
      // will look at the `docModel` property to find the right model.
      refPath: "msgModel",
    },
    msgModel: {
      type: String,
      required: true,
      enum: ["DirectMessage", "GroupMessage"],
    },
    expireAt: { type: Date, expires: 15 * 60 }, // expires at 15 min after created
  },
  {
    timestamps: true,
  }
);

const PersistMessage = new mongoose.model(
  "PersistMessage",
  persistMessageSchema
);

module.exports = PersistMessage;
