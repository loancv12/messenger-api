const User = require("../models/User");

module.exports = (io, socket) => {
  const userId = socket.userId;
  socket.join(userId);
  // notify existing users
  socket.broadcast.emit("user connected", {
    userId: userId,
  });

  socket.on("disconnect", async (reason) => {
    console.log("connection close", userId, reason);
    const matchingSockets = await io.in(userId).allSockets();

    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users in
      socket.broadcast.emit("user disconnected", userId);
      // update the connection status of the session
      await User.findByIdAndUpdate(userId, { online: false });
    }
  });
};
