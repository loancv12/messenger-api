const { chatTypes, cvsDB, msgDB } = require("../config/conversation");
const GroupConversation = require("../models/GroupConversation");
const User = require("../models/User");
const DirectConversation = require("../models/DirectConversation");
const makeMsgForRes = require("../utils/msgForRes");
const GroupUserRelation = require("../models/GroupUserRelation");
const JoinGroupRequest = require("../models/JoinGroupRequest");
const { transformObj } = require("../utils/transform");
const { populate } = require("dotenv");

const transformCvs = ({ userId, type, conversation }) => {
  const {
    _id,
    participants,
    adminId,
    name,
    updatedAt,
    lastMsg,
    numberOfUnreadMsgs,
  } = conversation;
  let solveCvs = {
    id: _id,
    name: "",
    msg: "",
    updatedAt,
    unread: numberOfUnreadMsgs,
    online: "",
    ...(type === chatTypes.DIRECT_CHAT
      ? {
          userId: "",
        }
      : {
          userIds: [],
          adminId,
        }),
  };

  //   solve name, userId, online,  userIds
  if (type == chatTypes.DIRECT_CHAT) {
    const { _id, firstName, lastName, online } = participants.find(
      (participant) => participant._id.toString() !== userId
    );
    solveCvs = {
      ...solveCvs,
      ...{ name: `${firstName} ${lastName}`, userId: _id, online },
    };
  } else {
    const isAnyOneOnline = participants.find((user) => user.online);
    solveCvs = {
      ...solveCvs,
      ...{
        name,
        userIds: participants.map((user) => user._id),
        online: !!isAnyOneOnline,
      },
    };
  }

  //solve msg
  // find last msg
  if (!lastMsg) {
    solveCvs = { ...solveCvs, msg: "" };
  } else {
    solveCvs = {
      ...solveCvs,
      msg: lastMsg.isDeleted
        ? "Message is deleted"
        : lastMsg.type === "text" || lastMsg.type === "link"
        ? lastMsg.text
        : "A file is send",
    };
  }

  return solveCvs;
};

exports.getDirectConversations = async (req, res) => {
  const { type } = req.query;

  const { userId } = req.user;

  if (!Object.values(chatTypes).includes(type))
    return res
      .status(400)
      .json(makeMsgForRes("error", "Type must be direct_chat or group_chat."));

  const existCvss = await cvsDB[type]
    .find({
      participants: {
        $all: [userId],
      },
    })
    .lean()
    .populate("participants", "firstName lastName _id online")
    .populate("lastMsg")
    .populate({
      path: "numberOfUnreadMsgs",
      match: {
        $and: [{ readUserIds: [] }, { from: { $not: { $eq: userId } } }],
      },
    });

  const solveList = existCvss.map((conversation) =>
    transformCvs({
      userId,
      type,
      conversation,
    })
  );

  res
    .status(200)
    .json(
      makeMsgForRes("success", "Conversation found successfully", solveList)
    );
};

exports.getGroupConversations = async (req, res) => {
  const { type } = req.query;

  const { userId } = req.user;

  if (!Object.values(chatTypes).includes(type))
    return res
      .status(400)
      .json(makeMsgForRes("error", "Type must be direct_chat or group_chat."));

  const existCvss = await cvsDB[type]
    .find({
      participants: {
        $all: [userId],
      },
    })
    .lean()
    .populate("participants", "firstName lastName _id online")
    .populate("lastMsg")
    .populate({
      path: "numberOfUnreadMsgs",
      match: {
        $and: [
          { readUserIds: { $ne: userId } },
          { from: { $not: { $eq: userId } } },
        ],
      },
    });

  const solveList = existCvss.map((conversation) =>
    transformCvs({
      userId,
      type,
      conversation,
    })
  );

  res
    .status(200)
    .json(
      makeMsgForRes("success", "Conversation found successfully", solveList)
    );
};

exports.getJoinGroupReqs = async (req, res) => {
  const { userId } = req.user;

  const requests = await JoinGroupRequest.find(
    {
      $and: [{ recipientId: userId }, { status: "requested" }],
    },
    "groupId senderId"
  )
    .lean()
    .populate("groupId", "_id name")
    .populate("senderId", "_id firstName lastName online");

  const transformMap = {
    groupId: {
      newKey: "group",
      nestedKey: {
        _id: {
          newKey: "id",
        },
      },
    },
    senderId: {
      newKey: "sender",
      nestedKey: {
        _id: {
          newKey: "id",
        },
      },
    },
  };

  const solveReq = requests.map((request) =>
    transformObj(request, transformMap)
  );

  res
    .status(200)
    .json(
      makeMsgForRes(
        "success",
        "Join group request found successfully",
        solveReq
      )
    );
};

exports.startConversation = async ({ userId, from, to }) => {
  // check if any conversation exist
  const existCvs = await DirectConversation.findOne({
    participants: {
      $all: [to, from],
    },
  })
    .lean()
    .populate("participants", "firstName lastName _id email online")
    .populate("lastMsg")
    .populate({
      path: "numberOfUnreadMsgs",
      match: {
        $and: [{ readUserIds: [] }, { from: { $not: { $eq: userId } } }],
      },
    });

  let conversation;

  // if there is no conversation between 2 pp
  if (!existCvs) {
    // create one
    let new_chat = await DirectConversation.create({
      participants: [to, from],
    });

    await new_chat.populate(
      "participants",
      "firstName lastName _id email online"
    );
    conversation = transformCvs({
      type: chatTypes.DIRECT_CHAT,
      userId,
      conversation: {
        ...new_chat.toObject(),
        lastMsg: null,
        numberOfUnreadMsgs: 0,
      },
    });
  } else {
    conversation = transformCvs({
      type: chatTypes.DIRECT_CHAT,
      userId,
      conversation: existCvs,
    });
  }

  return conversation;
};

exports.createGroup = async ({ name, members, adminId }) => {
  const newGroup = await GroupConversation.create({
    name,
    participants: [adminId],
  });

  await GroupUserRelation.create({
    groupId: newGroup._id,
    userId: adminId,
    role: "admin",
    status: "joined",
  });

  await JoinGroupRequest.create([
    ...members.map((member) => ({
      senderId: adminId,
      recipientId: member.id,
      groupId: newGroup._id,
      status: "requested",
    })),
  ]);

  const admin = await User.findById(adminId, "_id firstName lastName online");

  const conversation = {
    _id: newGroup._id,
    participants: [admin],
    adminId,
    name,
    updatedAt: newGroup.updatedAt,
    lastMsg: null,
    numberOfUnreadMsgs: 0,
  };

  const solveCvs = transformCvs({
    userId: adminId,
    type: chatTypes.GROUP_CHAT,
    conversation,
  });

  return {
    newGroupCvs: solveCvs,
  };
};

exports.addMember = async ({ userId, requestId, groupId, newMemberId }) => {
  console.log("addMember", userId, requestId, groupId, newMemberId);
  await JoinGroupRequest.findByIdAndUpdate(requestId, {
    status: "accepted",
  });

  await GroupUserRelation.create({
    groupId,
    userId: newMemberId,
    status: "joined",
    role: "normalUser",
  });

  const updatedGroupCvs = await GroupConversation.findByIdAndUpdate(
    groupId,
    {
      $push: { participants: newMemberId },
    },
    {
      runValidators: true,
      new: true,
    }
  )
    .lean()
    .populate("participants", "firstName lastName _id online");

  const conversation = transformCvs({
    userId,
    type: chatTypes.GROUP_CHAT,
    conversation: {
      ...updatedGroupCvs,
      lastMsg: null,
      numberOfUnreadMsgs: 0,
    },
  });

  return conversation;
};
