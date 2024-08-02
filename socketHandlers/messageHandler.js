const { chatTypes, msgDB } = require("../config/conversation");
const {
  createTextMsg,
  deleteMsg,
  updateSentSuccessMsgs,
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

      if (chatType === chatTypes.DIRECT_CHAT) {
        io.to(from).emit("new_messages", payload);
        io.to(to).emit("new_messages", payload);
      } else {
        io.in(conversationId).emit("new_messages", payload);
      }
    })
  );

  socket.on(
    "receive_new_msgs",
    errorHandler(socket, async (data) => {
      const { chatType, messages, conversationId } = data;

      await updateSentSuccessMsgs({
        chatType,
        messages,
        sentSuccess: "success",
      });

      const payload = {
        ...data,
        sentSuccess: "success",
      };

      if (chatType === chatTypes.DIRECT_CHAT) {
        io.to(messages[0].from).emit("update_sent_success", payload);
        io.to(messages[0].to).emit("update_sent_success", payload);
      } else {
        io.in(messages[0].conversationId).emit("update_sent_success", payload);
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
        console.log("delMsg", delMsg);

        const payload = { msgId, type };
        if (type === chatTypes.DIRECT_CHAT) {
          // meo no lai bi loi nay, REMEMBER any id must be with toString()
          io.to(delMsg.to.toString())
            .to(delMsg.from.toString())
            .emit("delete_message_ret", payload);
        } else {
          io.in(delMsg.conversationId.toString()).emit(
            "delete_message_ret",
            payload
          );
        }
      } else {
        console.log("userId at delete msg", userId);
        // careful when use socket.to(userId) ,
        // cause In that case, every socket in the room excluding the sender will get the event.
        io.to(userId).emit("delete_message_ret", {
          status: "error",
          message: "You don't not have permission to delete this msg",
        });
      }
    })
  );
};
