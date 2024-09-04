const { chatTypes, msgDB, msgModels } = require("../config/conversation");
const PersistMessage = require("../models/PersistMessage");
const Client = require("../models/Client");
const {
  createTextMsg,
  deleteMsg,
  updateSentSuccessMsgs,
  transformMsg,
} = require("../controllers/message");
const { errorHandler } = require("../socket");

const groupMsg = (foundMissMsgs) => {
  const solveMsgs = foundMissMsgs.reduce((clarifiedMsgs, msg) => {
    const chatType =
      msgModels[chatTypes.DIRECT_CHAT] === msg.msgModel
        ? chatTypes.DIRECT_CHAT
        : chatTypes.GROUP_CHAT;
    const conversationId = msg.msgId.conversationId.toString();

    const existGroupIndex = clarifiedMsgs.findIndex(
      (groupMsg) =>
        groupMsg.chatType === chatType &&
        groupMsg.conversationId.toString() === conversationId
    );

    // handle id and delete msg, reply msg
    const solveMsg = transformMsg({ msg: msg.msgId });
    if (existGroupIndex !== -1) {
      clarifiedMsgs[existGroupIndex].messages.push(solveMsg);
    } else {
      const groupMsg = {
        chatType,
        conversationId,
        messages: [solveMsg],
      };
      clarifiedMsgs.push(groupMsg);
    }
    return clarifiedMsgs;
  }, []);

  return solveMsgs;
};

module.exports = (io, socket) => {
  const userId = socket.userId;
  const clientId = socket.clientId;

  socket.on(
    "miss-msg",
    errorHandler(socket, async (data, callback) => {
      const { date, userId, clientId } = data;
      const foundMissMsgs = await PersistMessage.find({ clientId })
        .lean()
        .populate({
          path: "msgId",
          populate: {
            path: "replyMsgId",
            select: "_id text from isDeleted createdAt",
          },
        });

      if (foundMissMsgs.length) {
        await PersistMessage.deleteMany({ clientId });
        // transform to compatible with FE, group msg that have same chatType and conversationId to 1 groupMsg
        const groupMsgs = groupMsg(foundMissMsgs);
        callback(groupMsgs);

        // update msg in db and notice all from user that to user (this user) have receive miss msgs
        await Promise.all(
          groupMsgs.map(async ({ chatType, conversationId, messages }) => {
            const payload = {
              chatType,
              conversationId,
              messages,
              sentSuccess: "success",
            };

            io.to(messages[0].from.toString()).emit(
              "update_sent_success",
              payload
            );

            // update the state of msg
            await msgDB[chatType].updateMany(
              {
                _id: { $in: messages.map((msg) => msg.id) },
              },
              {
                $set: { sentSuccess: "success" },
              }
            );
          })
        );
      }
    })
  );

  socket.on(
    "text_message",
    errorHandler(socket, async (data) => {
      console.log("text_message", data);
      const { type: chatType, newMsg, tempId } = data;
      const { to, from, conversationId } = newMsg;
      const res = await createTextMsg({ userId, chatType, newMsg });

      const payload = {
        conversationId,
        messages: [res],
        chatType: chatType,
      };

      if (chatType === chatTypes.DIRECT_CHAT) {
        io.to(from).emit("new_messages", { ...payload, tempId });
        io.to(to).emit("new_messages", payload);
      } else {
        socket.emit("new_messages", { ...payload, tempId });
        socket.in(conversationId).emit("new_messages", payload);
      }

      // REMEMBER: this client is clientId of to user, not from user,
      //  so when the to receive it, it will delete right clientId for right tab, not client for to user of another tab
      // and when receiver miss it cause of lost connection, it will get right missed msg for it
      // TODO: now, i only persist when chatType is direct chat,
      // cause of this persist method is make many persist msg when chatType is groupChat
      // i dont have other solution for make sure that every tab receive miss packet yet, if you have, please let me know so we can discuss it together
      const clients = await Client.find({ userId: to }).lean();
      await PersistMessage.create(
        clients.map((client) => ({
          clientId: client.clientId,
          msgId: res.id.toString(),
          msgModel: msgModels[chatType],
          expireAt: new Date(),
        }))
      );
    })
  );

  socket.on(
    "receive_new_msgs",
    errorHandler(socket, async (data) => {
      const { chatType, messages, conversationId } = data;

      await PersistMessage.deleteMany({
        $and: [
          { msgId: { $in: [messages.map((msg) => msg.id)] } },
          { clientId },
        ],
      });

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
    "read_msg",
    errorHandler(socket, async (data) => {
      const { conversationId, chatType, from, to } = data;
      console.log("read_msg", data);
      const filter =
        chatType === chatTypes.DIRECT_CHAT
          ? { conversationId, readUserIds: [] }
          : {
              $and: [
                { conversationId },
                { readUserIds: { $not: { $all: [userId] } } },
              ],
            };
      const update =
        chatType === chatTypes.DIRECT_CHAT
          ? {
              $set: { readUserIds: [userId] },
            }
          : {
              $push: { readUserIds: userId },
            };
      await msgDB[chatType].updateMany(filter, update);

      const payload = {
        newSeenUserId: userId,
        conversationId,
        chatType,
      };

      if (chatType === chatTypes.DIRECT_CHAT) {
        io.to(from).emit("update_read_users", payload);
        io.to(to).emit("update_read_users", payload);
      } else {
        io.in(conversationId).emit("update_read_users", payload);
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

        const payload = { msgId, type, conversationId: msg.conversationId };
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
