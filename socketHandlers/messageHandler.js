const { chatTypes, msgDB } = require("../config/conversation");
const { createTextMsg, deleteMsg } = require("../controllers/message");
const { errorHandler } = require("../socket");

module.exports = (io, socket) => {
  const userId = socket.userId;

  socket.on(
    "text_message",
    errorHandler(socket, async (data) => {
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

      // return all Socket instances of the main namespace
      // const sockets = await io.fetchSockets();
      // console.log("sockets", sockets);
      console.log("payload", payload);
      if (chatType === chatTypes.DIRECT_CHAT) {
        io.to(to).to(from).emit("new_messages", payload);
      } else {
        io.in(conversationId).emit("new_messages", payload);
      }
    })
  );

  if (!socket.recovered) {
    // if the connection state recovery was not successful
    console.log(
      "socket.recovered",
      socket.recovered,
      socket.handshake.auth.serverOffset
    );
  }

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
