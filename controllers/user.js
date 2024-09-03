const mongoose = require("mongoose");
const User = require("../models/User");
const FriendShip = require("../models/FriendShip");
const filterObj = require("../utils/filterObj");
const {
  transformObj,
  replaceId,
  transformId,
  transformFriendReq,
} = require("../utils/transform");
const makeMsgForRes = require("../utils/msgForRes");

exports.getMe = async (req, res, next) => {
  const { userId } = req.user;

  const userInfo = await User.findById(
    userId,
    "_id firstName lastName online avatar"
  ).lean();

  return res.json(
    makeMsgForRes(
      "success",
      "Get current user info successfully",
      transformObj(userInfo, transformId)
    )
  );
};

exports.updateMe = async (req, res, next) => {
  const { user } = req;

  const filteredBody = filterObj(
    user,
    "firstName",
    "lastName",
    "avatar",
    "about"
  );

  const updated_user = await User.findByIdAndUpdate(user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: updated_user,
    message: "Profile Updated successfully",
  });
};

exports.getUsers = async (req, res, next) => {
  const { userId } = req.user;

  // get all user that I NOT make friend request, be requested make friend, be friend with
  const friendShips = await FriendShip.find({
    $or: [{ recipientId: userId }, { senderId: userId }],
  })
    .select("recipientId senderId")
    .lean();

  const inRelationUsers = friendShips.map((friendShip) => {
    const isSender = friendShip.senderId.toString() === userId;
    return isSender
      ? friendShip.recipientId.toString()
      : friendShip.senderId.toString();
  });

  const remainUsers = await User.find({
    $and: [{ verified: true }, { _id: { $nin: [...inRelationUsers, userId] } }],
  })
    .select("firstName lastName id online")
    .lean();

  const solveUsers = remainUsers.map((user) => {
    return transformObj(user, transformId);
  });

  res.status(200).json({
    status: "success",
    data: solveUsers,
    message: "Users found successfully",
  });
};

exports.getFriends = async (req, res, next) => {
  const { userId } = req.user;

  const friendShips = await FriendShip.find({
    $and: [
      { $or: [{ recipientId: userId }, { senderId: userId }] },
      { status: "accepted" },
    ],
  })
    .select("-status")
    .lean()
    .populate({ path: "recipientId", select: "_id firstName lastName online" })
    .populate({ path: "senderId", select: "_id firstName lastName online" });

  const solveUsers = friendShips.map((friendShip) => {
    const { recipientId, senderId } = friendShip;
    if (recipientId._id.toString() === userId) {
      return transformObj(senderId, transformId);
    } else return transformObj(recipientId, transformId);
  });

  res.status(200).json({
    status: "success",
    data: solveUsers,
    message: "Friends Found successully",
  });
};

exports.getRequests = async (req, res, next) => {
  const { userId } = req.user;

  const friendShips = await FriendShip.find({
    $and: [
      { $or: [{ recipientId: userId }, { senderId: userId }] },
      { status: "requested" },
    ],
  })
    .select("-status")
    .lean()
    .populate({
      path: "recipientId",
      select: "_id firstName lastName online",
    })
    .populate({ path: "senderId", select: "_id firstName lastName online" });

  const solveFriendReq = friendShips.map((friendShip) =>
    transformObj(friendShip, transformFriendReq)
  );

  res.status(200).json({
    status: "success",
    data: solveFriendReq,
    message: "Friends requests Found successully",
  });
};

exports.makeFriendReq = async ({ senderId, recipientId }) => {
  const res = await FriendShip.create({
    senderId,
    recipientId,
    status: "requested",
  });

  await res.populate({
    path: "senderId",
    select: "_id firstName lastName avatar",
  });
  await res.populate({
    path: "recipientId",
    select: "_id firstName lastName avatar",
  });

  return transformObj(res.toObject(), transformFriendReq);
};

exports.acceptFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndUpdate(requestId, {
    status: "accepted",
  })
    .lean()
    .populate({
      path: "senderId",
      select: "_id firstName lastName avatar",
    })
    .populate({
      path: "recipientId",
      select: "_id firstName lastName avatar",
    });

  return transformObj(request, transformFriendReq);
};

exports.declineFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndDelete(requestId)
    .lean()
    .populate({
      path: "senderId",
      select: "_id firstName lastName avatar",
    })
    .populate({
      path: "recipientId",
      select: "_id firstName lastName avatar",
    });

  return transformObj(request, transformFriendReq);
};

exports.withdrawFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndDelete(requestId)
    .lean()
    .populate({
      path: "senderId",
      select: "_id firstName lastName avatar",
    })
    .populate({
      path: "recipientId",
      select: "_id firstName lastName avatar",
    });

  return transformObj(request, transformFriendReq);
};
