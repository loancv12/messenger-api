const { msgDB } = require("../config/conversation");

const addMsg = async (userId, chatType, newMessage) => {
  const res = await msgDB[chatType].create(newMessage);
  const chat = {};
  if (res.isReply) {
    await res.populate({
      path: "mesReplyId",
      select: "_id isDeleted text from",
    });
  }

  chat.messages.push(res._id);
  chat.latestTime = res.createdAt;
  // await chat.save();

  const solveMsg = transformMsg({ userId, msg: res.toObject() });
};

module.exports = addMsg;
