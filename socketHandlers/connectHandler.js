const Client = require("../models/Client");
const GroupUserRelation = require("../models/GroupUserRelation");
const PersistMessage = require("../models/PersistMessage");
const User = require("../models/User");

module.exports = async (io, socket) => {
  const userId = socket.userId;
  const clientId = socket.clientId;
  console.log("socketId", socket.id, userId);
  socket.join(userId);

  // notify existing users
  socket.broadcast.emit("user connected", {
    userId: userId,
  });

  socket.on("disconnect", async (reason) => {
    socket.leave(userId);
    const foundClient = await Client.findOneAndUpdate(
      { clientId },
      { socketId: null }
    );
    const matchingSockets = await io.in(userId).allSockets();

    const isDisconnected = matchingSockets.size === 0;
    console.log("connection close", userId, socket.id, reason, isDisconnected);
    if (isDisconnected) {
      // notify other users in
      socket.broadcast.emit("user disconnected", userId);
      // update the connection status of the session
      await User.findByIdAndUpdate(userId, { online: false });

      // clear all client and persist msg when user logout
      // when they log in, they call http to get all msg,
      // right after sender emit event, msg is stored in db, so there is no missed in DirectMsg and GroupMsg
    }
  });

  const groups = await GroupUserRelation.find({ userId }, "groupId").lean();
  socket.join(groups.map((group) => group.groupId.toString()));
};
