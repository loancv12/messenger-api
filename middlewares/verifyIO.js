const User = require("../models/User");
const Client = require("../models/Client");

// the Socket instance is not actually connected when the middleware gets executed,
const verifyIO = async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  const clientId = socket.handshake.auth.clientId;
  if (!userId || !clientId) {
    return next(new Error("invalid userId"));
  } else {
    try {
      const foundUser = await User.findById(userId, "online").exec();
      if (!foundUser) {
        return next(new Error("invalid userId"));
      }
      console.log("socket id in verfify userId", socket.id, clientId);
      const foundClient = await Client.findOneAndUpdate(
        { clientId },
        { socketId: socket.id }
      ).lean();

      if (!foundUser.online) {
        foundUser.online = true;
        await foundUser.save();
      }
    } catch (error) {
      return next(new Error("invalid userId"));
    }

    socket.userId = userId;
    socket.clientId = clientId;
    next();
  }
};

module.exports = verifyIO;
