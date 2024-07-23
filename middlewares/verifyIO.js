const User = require("../models/User");

// the Socket instance is not actually connected when the middleware gets executed,
const verifyIO = async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  console.log("userId in verifyIO", userId);
  if (!userId) {
    return next(new Error("invalid userId"));
  } else {
    try {
      const foundUser = await User.findById(userId, "online").exec();
      console.log("foundUser have exec", foundUser);
      if (!foundUser) {
        return next(new Error("invalid userId"));
      }
      if (!foundUser.online) {
        foundUser.online = true;
        await foundUser.save();
      }
    } catch (error) {
      return next(new Error("invalid userId"));
    }

    socket.userId = userId;
    next();
  }
};

module.exports = verifyIO;
