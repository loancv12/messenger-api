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

  if (solveMsg.isReply) {
    const { text, _id, ...rest } = msg.replyMsgId;
    solveMsg.replyMsg = {
      ...rest,
      id: _id,
      text: msg.replyMsgId.isDeleted
        ? "Message is deleted"
        : msg.replyMsgId.text,
    };
  }
  solveMsg.replyMsg = solveMsg.isReply
    ? {
        ...msg.replyMsgId,
        id: msg.replyMsgId._id,
        from: msg.replyMsgId.from,
        text: msg.replyMsgId.isDeleted
          ? "Message is deleted"
          : msg.replyMsgId.text,
      }
    : null;

  return solveMsg;
};

exports.transformMsg = transformMsg;

exports.getDirectMessages = async (req, res, next) => {
  const { type, conversationId, endCursor, startCursor } = req.query;
  console.log("startCursor", startCursor, endCursor);
  if (!Object.values(chatTypes).includes(type) || !conversationId || !endCursor)
    return res.status(400).json({
      error: "Type must be direct_chat or group_chat",
    });

  let retCvs;
  let isHaveMoreMsg;
  if (!startCursor) {
    retCvs = await cvsDB[type]
      .findById(conversationId, "messages")
      .lean()
      .populate({
        path: "messages",
        options: {
          sort: { createdAt: -1 },
          // add msgsLimit+1 to check isHaveMoreMsg, if it return 21=> have more, else, dont have more
          perDocumentLimit: msgsLimit + 1,
        },
        populate: {
          path: "replyMsgId",
          select: "_id text from isDeleted createdAt",
        },
        match: { createdAt: { $lt: endCursor } },
      });

    isHaveMoreMsg = retCvs.messages.length === msgsLimit + 1 ? 1 : "";
  } else {
    retCvs = await cvsDB[type]
      .findById(conversationId, "messages")
      .lean()
      .populate({
        path: "messages",
        options: {
          sort: { createdAt: -1 },
        },
        populate: {
          path: "replyMsgId",
          select: "_id text from isDeleted createdAt",
        },
        match: {
          $and: [
            { createdAt: { $gte: startCursor } },
            { createdAt: { $lt: endCursor } },
          ],
        },
      });

    const res = await cvsDB[type]
      .findById(conversationId, "messages")
      .lean()
      .populate({
        path: "messages",
        options: {
          perDocumentLimit: 1,
          match: { createdAt: { $lt: startCursor } },
        },
      });
    isHaveMoreMsg = res ? 1 : "";
  }

  if (!retCvs)
    return res.status(404).json({
      status: "error",
      messages: "Conversation not found",
    });

  res.append("x-pagination", isHaveMoreMsg);

  // because of sort: { createdAt: -1 } when getMsg, all msg is ordered from latest:0 to oldest:21
  // cause when get 21 msgs, we need to pop it
  const msgs = retCvs.messages;
  if (!startCursor && isHaveMoreMsg) {
    msgs.pop();
  }

  // solve for deleted msg
  // reverse it: oldest:0 to latest:20
  const solveList = msgs.map((_, i) =>
    transformMsg({ msg: msgs[msgs.length - 1 - i] })
  );

  res.status(200).json({
    messages: "Get message successfully",
    data: solveList,
  });
};

exports.getGroupMessages = async (req, res) => {
  const { type, conversationId, endCursor, startCursor } = req.query;
  console.log("startCursor", startCursor, endCursor);
  if (!Object.values(chatTypes).includes(type) || !conversationId || !endCursor)
    return res.status(400).json({
      error: "Type must be direct_chat or group_chat",
    });

  let retCvs;
  let isHaveMoreMsg;
  if (!startCursor) {
    retCvs = await cvsDB[type]
      .findById(conversationId, "messages")
      .lean()
      .populate({
        path: "messages",
        options: {
          sort: { createdAt: -1 },
          // add msgsLimit+1 to check isHaveMoreMsg, if it return 21=> have more, else, dont have more
          perDocumentLimit: msgsLimit + 1,
        },
        populate: {
          path: "replyMsgId",
          select: "_id text from isDeleted createdAt",
        },
        match: { createdAt: { $lt: endCursor } },
      });

    isHaveMoreMsg = retCvs.messages.length === msgsLimit + 1 ? 1 : "";
  } else {
    retCvs = await cvsDB[type]
      .findById(conversationId, "messages")
      .lean()
      .populate({
        path: "messages",
        options: {
          sort: { createdAt: -1 },
        },
        populate: {
          path: "replyMsgId",
          select: "_id text from isDeleted createdAt",
        },
        match: {
          $and: [
            { createdAt: { $gte: startCursor } },
            { createdAt: { $lt: endCursor } },
          ],
        },
      });

    const res = await cvsDB[type]
      .findById(conversationId, "messages")
      .lean()
      .populate({
        path: "messages",
        options: {
          perDocumentLimit: 1,
          match: { createdAt: { $lt: startCursor } },
        },
      });
    isHaveMoreMsg = res ? 1 : "";
  }

  if (!retCvs)
    return res.status(404).json({
      status: "error",
      messages: "Conversation not found",
    });

  res.append("x-pagination", isHaveMoreMsg);

  // because of sort: { createdAt: -1 } when getMsg, all msg is ordered from latest:0 to oldest:21
  // cause when get 21 msgs, we need to pop it
  const msgs = retCvs.messages;
  if (!startCursor && isHaveMoreMsg) {
    msgs.pop();
  }

  // solve for deleted msg
  // reverse it: oldest:0 to latest:20
  const solveList = msgs.map((_, i) =>
    transformMsg({ msg: msgs[msgs.length - 1 - i] })
  );

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
  // const unreadMs = await msgDB[chatType].updateMany(
  //   {
  //     $and: [
  //       { conversationId },
  //       { unread: true },
  //       { from: { $not: { $eq: userId } } },
  //     ],
  //   },
  //   { $set: { unread: false } }
  // );

  // update latest time
  chat.lastMsgCreatedTime = res.createdAt;
  await chat.save();
  // save to db

  const solveMsg = transformMsg({ userId, msg: res.toObject() });
  return solveMsg;
};

exports.updateSentSuccessMsg = async ({ msgId, chatType }) => {
  console.log("updateSentSuccessMsg", msgId, chatType);
  const res = await msgDB[chatType].findByIdAndUpdate(msgId, {
    sentSuccess: true,
  });
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
