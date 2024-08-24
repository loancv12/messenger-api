const User = require("../models/User");
const Client = require("../models/Client");

// the Socket instance is not actually connected when the middleware gets executed,
const verifyUserForCall = async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  const roomId = socket.handshake.auth.roomId;
  console.log("verifyUserForCall", socket.handshake.auth);
  if (!userId || !roomId) {
    return next(new Error("invalid userId"));
  } else {
    try {
      const foundUser = await User.findById(userId, "online").exec();
      if (!foundUser) {
        return next(new Error("invalid userId"));
      }
    } catch (error) {
      return next(new Error("invalid userId"));
    }

    socket.userId = userId;
    next();
  }
};

module.exports = verifyUserForCall;
