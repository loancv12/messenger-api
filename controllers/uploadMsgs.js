const { instance } = require("../socket");
const { add } = require("date-fns");
const { msgInterval, msgModels } = require("../config/conversation");
const { uploadFileToFb } = require("../services/firebase");
const makeMsgForRes = require("../utils/msgForRes");
const {
  chatTypes,
  cvsDB,
  msgDB,
  msgsLimit,
} = require("../config/conversation");
const { transformMsg, updateSentSuccessMsgs } = require("./message");
const Client = require("../models/Client");
const PersistMessage = require("../models/PersistMessage");

const uploadFiles = async (req, res) => {
  const { files } = req;
  const { to, from, conversationId, chatType, isReply, replyMsgId } = req.body;
  console.log("files", files);
  if (!files?.length)
    return res
      .status(404)
      .json(makeMsgForRes("error", "There is no file exist"));

  const chat = await cvsDB[chatType].findById(conversationId).exec();

  // upload to fire storage and db
  // sorry for this stupid name
  const linkAndNameAndTypes = await Promise.all(
    files.map(async (file, i) => {
      const { originalname, mimetype, size, buffer } = file;

      const ext = originalname.substring(originalname.lastIndexOf("."));
      // handling of filename containing utf-8 characters
      const originalnameUft8 = Buffer.from(originalname, "latin1").toString(
        "utf8"
      );

      const blobFile = new Blob([buffer]);
      // avoid use originalname, create new one instead, read docs for more about Limitations on References
      const path = `message/${Date.now().toString()}`;
      const name = `${path}.${ext}`;
      const metadata = {
        contentType: mimetype,
        name,
        size,
      };

      const link = await uploadFileToFb({
        path,
        blobFile,
        metadata,
      });
      return {
        link,
        originalname: originalnameUft8,
        type: mimetype.startsWith("image") ? "img" : "doc",
      };
    })
  );

  // after msgInterval min, if y send a msg, thif msg have a timeline above it, this var to check it
  const isStartMsg =
    add(chat.lastMsgCreatedTime, { minutes: msgInterval }) < new Date();

  // make all image as a single msg
  const newMessages = linkAndNameAndTypes.reduce(
    (clarifiedMsgs, { link, originalname, type }, i) => {
      console.log("link and type", { link, originalname, type });
      const imgMsgIndex = clarifiedMsgs.findIndex(
        (newMsg) => newMsg.type === "img"
      );

      if (type === "img" && imgMsgIndex !== -1) {
        // do clarifiedMsgs have a msg that type img, if yes, push a link to it, not create one
        clarifiedMsgs[imgMsgIndex].files.push({ link, alt: originalname });
      } else {
        const newMessage = {
          conversationId,
          from,
          type,
          text: "",
          files: [{ link, alt: originalname }],
          isReply,
          // cause of append of formdata convert value to string, so value of replyMsgId can be ''
          // '' can not cast to ObjectId
          replyMsgId: replyMsgId ? replyMsgId : null,
          isStartMsg: i === 0 ? isStartMsg : false,
          ...(chatType === chatTypes.DIRECT_CHAT && { to }),
        };
        clarifiedMsgs.push(newMessage);
      }

      return clarifiedMsgs;
    },
    []
  );

  // create new messages and populate, i know some comment look stupid, but it good for visually separate the block of logic
  const ret = await msgDB[chatType].create(newMessages);

  if (isReply) {
    await msgDB[chatType].populate(ret, {
      path: "replyMsgIdId",
      select: "_id isDeleted text from",
    });
  }

  // make sure lastMsgCreatedTime is last msg createdAt, cause the virtual field lastMsg of Direct or Group Cvs need it
  chat.lastMsgCreatedTime = ret[ret.length - 1].createdAt;
  await chat.save();

  const solveMsgs = ret.map((msg) => transformMsg({ msg: msg.toObject() }));

  // REMEMBER: this client is clientId of to user, not from user,
  //  so when the to receive it, it will delete right clientId for right tab, not client for to user of another tab
  // and when receiver miss it cause of lost connection, it will get right missed msg for it
  const clients = await Client.find({ userId: to }).lean();
  const persistMsgs = clients.flatMap((client) =>
    solveMsgs.map((msg) => ({
      clientId: client.clientId,
      msgId: msg.id.toString(),
      msgModel: msgModels[chatType],
      expireAt: new Date(),
    }))
  );

  await PersistMessage.create(persistMsgs);

  // emit it to to and from
  const io = instance.getIO();
  if (instance.ready()) {
    const payload = {
      conversationId,
      messages: solveMsgs,
      chatType,
    };

    if (chatType === chatTypes.DIRECT_CHAT) {
      io.to(from).emit("new_messages", payload);
      io.to(to).emit("new_messages", payload);
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
