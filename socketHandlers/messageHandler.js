const { chatTypes, msgDB } = require("../config/conversation");
const {
  createTextMsg,
  deleteMsg,
  updateSentSuccessMsg,
} = require("../controllers/message");
const { errorHandler } = require("../socket");

module.exports = (io, socket) => {
  const userId = socket.userId;

  socket.on(
    "seen-msg",
    errorHandler(socket, async (data) => {
      const { lastMsgCreated, chatType } = data;
      console.log("seen-msg", lastMsgCreated, chatType);
    })
  );

  socket.on(
    "text_message",
    errorHandler(socket, async (data, callback) => {
      console.log("text_message", data);
      const { type: chatType, newMsg } = data;
      const { to, from, conversationId } = newMsg;
      console.log("userId at socket handler", userId);
      const res = await createTextMsg({ userId, chatType, newMsg });
      const payload = {
        conversationId,
        messages: [res],
        chatType: chatType,
      };

      const callbackForSentSuccess = async () => {
        console.log("call callback");
        await updateSentSuccessMsg({
          chatType,
          msgId: res.id.toString(),
        });
        callback({ chatType, msgId: res.id.toString(), status: "success" });
      };

      if (chatType === chatTypes.DIRECT_CHAT) {
        io.to(from).emit("new_messages", payload);
        io.to(to).emit("new_messages", payload, callbackForSentSuccess);
      } else {
        io.in(conversationId).emit("new_messages", payload);
      }
    })
  );

  socket.on(
    "delete_message",
    errorHandler(socket, async (data) => {
      const { msgId, type } = data;
      console.log("delete_message", data);
      // throw new Error("test");
      // TODO
      const msg = await msgDB[type].findById(msgId);
      if (msg.from.toString() === userId) {
        const delMsg = await deleteMsg({ msgId, type });

        const payload = { msgId, type };
        if (type === chatTypes.DIRECT_CHAT) {
          socket
            .to(delMsg.to)
            .to(delMsg.from)
            .emit("delete_message_ret", payload);
        } else {
          io.in(delMsg.conversationId.toString()).emit(
            "delete_message_ret",
            payload
          );
        }
      } else {
        socket.to(userId).emit("delete_message_ret", {
          status: "error",
          message: "You don't not have permission to delete this msg",
        });
      }
    })
  );
};
