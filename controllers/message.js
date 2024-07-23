const {
  chatTypes,
  cvsDB,
  msgDB,
  msgsLimit,
} = require("../config/conversation");
const { add } = require("date-fns");
const { msgInterval } = require("../config/conversation");
const User = require("../models/User");

const transformMsg = ({ msg }) => {
  const { _id, replyMsgId, ...rest } = msg;
  const solveMsg = { ...rest };
  solveMsg.id = msg._id;

  if (solveMsg?.isDeleted) {
    solveMsg.text = "Message is deleted";
    solveMsg.file = "Message is deleted";
  }

  solveMsg.replyMsg = solveMsg.isReply
    ? {
        id: msg.replyMsgId._id,
        from: msg.replyMsgId.from,
        text: msg.replyMsgId.isDeleted
          ? "Message is deleted"
          : msg.replyMsgId.text,
      }
    : null;

  if (solveMsg.unread) {
    solveMsg.unread = false;
  }
  return solveMsg;
};

exports.transformMsg = transformMsg;

exports.getDirectMessages = async (req, res, next) => {
  const { type, conversationId, page = 1 } = req.query;

  const { userId } = req.user;

  if (!Object.values(chatTypes).includes(type) || !conversationId || page < 1)
    return res.status(400).json({
      error: "Type must be direct_chat or group_chat. Page must be >=1",
    });

  const retCvs = await cvsDB[type]
    .findById(conversationId, "messages")
    .lean()
    .populate({
      path: "messages",
      options: {
        sort: { createdAt: -1 },
        skip: msgsLimit * (page - 1),
        perDocumentLimit: msgsLimit,
      },
      populate: {
        path: "replyMsgId",
        select: "_id text from isDeleted",
      },
    })
    .populate("numberOfMessages");
  if (!retCvs)
    return res.status(404).json({
      status: "error",
      messages: "Conversation not found",
    });

  res.append(
    "x-pagination",
    `${retCvs ? Math.ceil(retCvs.numberOfMessages / msgsLimit) : 1}`
  );

  const unreadMs = await msgDB[type].updateMany(
    {
      $and: [
        { conversationId },
        { unread: true },
        { from: { $not: { $eq: userId } } },
      ],
    },
    { $set: { unread: false } }
  );

  // solve for deleted and unread msg,
  // because of sort: { createdAt: -1 } when getMsg, all msg is ordered from latest to oldest
  // FE need reverse order of that so for loop is suitable.
  const solveList = [];
  for (let i = retCvs.messages.length - 1; i >= 0; i--) {
    solveList.push(transformMsg({ msg: retCvs.messages[i] }));
  }

  res.status(200).json({
    messages: "Get message successfully",
    data: solveList,
  });
};

exports.getGroupMessages = async (req, res) => {
  const { type, conversationId, page = 1 } = req.query;

  const { userId } = req.user;

  if (!Object.values(chatTypes).includes(type) || !conversationId || page < 1)
    return res.status(400).json({
      error: "Type must be direct_chat or group_chat. Page must be >=1",
    });

  const retCvs = await cvsDB[type]
    .findById(conversationId, "messages")
    .lean()
    .populate({
      path: "messages",
      options: {
        sort: { createdAt: -1 },
        skip: msgsLimit * (page - 1),
        perDocumentLimit: msgsLimit,
      },
      populate: {
        path: "replyMsgId",
        select: "_id text from isDeleted",
      },
    })
    .populate("numberOfMessages");
  if (!retCvs)
    return res.status(404).json({
      status: "error",
      messages: "Conversation not found",
    });

  res.append(
    "x-pagination",
    `${retCvs ? Math.ceil(retCvs.numberOfMessages / msgsLimit) : 1}`
  );

  const unreadMs = await msgDB[type].updateMany(
    {
      $and: [
        { conversationId },
        { unread: true },
        { from: { $not: { $eq: userId } } },
      ],
    },
    { $set: { unread: false } }
  );

  // solve for deleted and unread msg,
  // because of sort: { createdAt: -1 } when getMsg, all msg is ordered from latest to oldest
  // FE need reverse order of that so for loop is suitable.
  const solveList = [];
  for (let i = retCvs.messages.length - 1; i >= 0; i--) {
    solveList.push(transformMsg({ msg: retCvs.messages[i] }));
  }

  res.status(200).json({
    messages: "Get message successfully",
    data: solveList,
  });
};

exports.createTextMsg = async ({ userId, chatType, newMsg }) => {
  const { to, from, text, conversationId, type, isReply, replyMsgId } = newMsg;

  const chat = await cvsDB[chatType].findById(conversationId);

  const isStartMsg =
    add(chat.lastMsgCreatedTime, { minutes: msgInterval }) < new Date();

  // create a msg
  let new_message = {
    conversationId,
    from,
    type,
    text,
    isReply,
    replyMsgId: replyMsgId ? replyMsgId : null,
    isStartMsg,
    ...(chatType === chatTypes.DIRECT_CHAT && { to }),
  };

  let res = await msgDB[chatType].create(new_message);

  if (res.isReply) {
    await res.populate({
      path: "replyMsgId",
      select: "_id isDeleted text from",
    });
  }

  // update unread msg
  const unreadMs = await msgDB[chatType].updateMany(
    {
      $and: [
        { conversationId },
        { unread: true },
        { from: { $not: { $eq: userId } } },
      ],
    },
    { $set: { unread: false } }
  );

  // update latest time
  chat.lastMsgCreatedTime = res.createdAt;
  await chat.save();
  // save to db

  const solveMsg = transformMsg({ userId, msg: res.toObject() });
  return solveMsg;
};

exports.deleteMsg = async ({ msgId, type }) => {
  const delMsg = await msgDB[type]
    .findByIdAndUpdate(
      msgId,
      {
        isDeleted: true,
      },
      { returnDocument: "after" }
    )
    .lean();

  return delMsg;
};
