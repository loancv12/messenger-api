const { instance } = require("../socket");
const { add } = require("date-fns");
const { msgInterval } = require("../config/conversation");
const { uploadFileToFb } = require("../services/firebase");
const makeMsgForRes = require("../utils/msgForRes");
const {
  chatTypes,
  cvsDB,
  msgDB,
  msgsLimit,
} = require("../config/conversation");
const { transformMsg } = require("./message");

const uploadFiles = async (req, res) => {
  const { files } = req;
  const { to, from, conversationId, chatType, isReply, replyMsgId } = req.body;
  if (!files.length)
    return res
      .status(404)
      .json(makeMsgForRes("error", "There is no file exist"));

  const chat = await cvsDB[chatType].findById(conversationId).exec();

  // upload to fire storage and db
  const newMessages = await Promise.all(
    files.map(async (file, i) => {
      const { originalname, mimetype, fileName, path, size } = file;

      // TODO: check size

      // handling of filename containing utf-8 characters
      const originalnameUft8 = Buffer.from(originalname, "latin1").toString(
        "utf8"
      );
      const destination = `${Date.now().toString()}_${originalnameUft8}`;
      const options = {
        metadata: {
          resumable: false,
          metadata: {
            contentType: mimetype,
          },
        },
      };
      const link = await uploadFileToFb({
        path,
        destination,
        options,
      });

      //
      const isStartMsg =
        add(chat.lastMsgCreatedTime, { minutes: msgInterval }) < new Date();

      const newMessage = {
        conversationId,
        from,
        type: mimetype.startsWith("image") ? "img" : "doc",
        text: originalnameUft8,
        file: link,
        isReply,
        // cause of append of formdata convert value to string, so value of replyMsgId can be ''
        // '' can not cast to ObjectId
        replyMsgId: replyMsgId ? replyMsgId : null,
        isStartMsg,
        ...(chatType === chatTypes.DIRECT_CHAT && { to }),
      };
      const res = await msgDB[chatType].create(newMessage);

      if (res.isReply) {
        await res.populate({
          path: "replyMsgIdId",
          select: "_id isDeleted text from",
        });
      }

      chat.lastMsgCreatedTime = res.createdAt;
      await chat.save();

      const solveMsg = transformMsg({ msg: res.toObject() });
      return solveMsg;
    })
  );

  // emit event to other side
  const io = instance.getIO();
  if (instance.ready()) {
    const payload = {
      conversationId,
      messages: newMessages,
      chatType,
    };

    if (chatType === chatTypes.DIRECT_CHAT) {
      io.to(to).to(from).emit("new_messages", payload);
    } else {
      io.to(conversationId).emit("new_messages", payload);
    }
  } else
    return res
      .status(500)
      .json(makeMsgForRes("error", "Somw thing wrong when connect to socket"));

  res.status(200).json(makeMsgForRes("success", "Upload successfully"));
};

module.exports = uploadFiles;
