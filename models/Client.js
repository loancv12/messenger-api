const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      require: true,
    },
    userId: {
      require: true,
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    socketId: {
      type: String,
    },
    // to change this value, delete the collection first, then restart the app.
    // cause You cannot use createIndex() to change the value of expireAfterSeconds of an existing index. Instead use the collMod database command. See Change the expireAfterSeconds value for a TTL Index.
    // When your application starts up, Mongoose automatically calls createIndex for each defined index in your schema. Mongoose will call createIndex for each index sequentially, and emit an 'index' event on the model when all the createIndex calls succeeded or when there was an error.
    expireAt: { type: Date, expires: 1 * 24 * 60 * 60 }, // expires at 1 days after created
  },
  {
    timestamps: true,
  }
);

const Client = new mongoose.model("Client", clientSchema);

module.exports = Client;
