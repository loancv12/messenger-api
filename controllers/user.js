const mongoose = require("mongoose");
const User = require("../models/user");
const FriendShip = require("../models/FriendShip");
const filterObj = require("../utils/filterObj");
const { transformObj, replaceId } = require("../utils/transform");

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

  const allUsers = await User.find({
    verified: true,
  })
    .select("firstName lastName id online")
    .lean();

  const friendShips = await FriendShip.find({
    $and: [
      {
        $or: [{ recipientId: userId }, { senderId: userId }],
      },
      {
        status: { $not: { $eq: "declined" } },
      },
    ],
  })
    .select("recipientId senderId")
    .lean();

  const remainUsers = allUsers.filter((user) => {
    console.log("uer have id?", user.id);
    // flag to check if current user is in relation.
    // this relation can be curr user sending friend req to other, accepted friend req or block other user
    const isInRelation = friendShips.find(
      (relation) =>
        relation.recipientId.toString() === user._id.toString() ||
        relation.senderId.toString() === user._id.toString()
    );
    return !isInRelation && user._id.toString() !== userId;
  });

  const transformMap = {
    _id: {
      newKey: "id",
    },
  };
  const solveUsers = remainUsers.map((user) => {
    console.log("users", transformObj(user, transformMap));
    console.log("users", user);

    return transformObj(user, transformMap);
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

  const transformMap = {
    _id: {
      newKey: "id",
    },
  };
  const solveUsers = friendShips.map((friendShip) => {
    const { recipientId, senderId } = friendShip;
    if (recipientId._id.toString() === userId) {
      return transformObj(senderId, transformMap);
    } else return transformObj(recipientId, transformMap);
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
    .populate({ path: "recipientId", select: "_id firstName lastName online" })
    .populate({ path: "senderId", select: "_id firstName lastName online" });

  const transformMap = {
    _id: {
      newKey: "id",
    },
  };
  const solveUsers = friendShips.map((friendShip) => {
    const { recipientId, senderId } = friendShip;
    if (recipientId._id.toString() === userId) {
      return {
        id: friendShip._id,
        user: { ...transformObj(senderId, transformMap) },
        isSender: false,
      };
    } else
      return {
        id: friendShip._id,
        user: { ...transformObj(recipientId, transformMap) },
        isSender: true,
      };
  });

  res.status(200).json({
    status: "success",
    data: solveUsers,
    message: "Friends requests Found successully",
  });
};

exports.makeFriendReq = async ({ from, to }) => {
  const res = await FriendShip.create({
    senderId: from,
    recipientId: to,
    status: "requested",
  });

  await res.populate({
    path: "senderId",
    select: "_id firstName lastName",
  });
  await res.populate({
    path: "recipientId",
    select: "_id firstName lastName",
  });

  const solveRes = res.toObject({
    transform: replaceId,
    replace: {
      _id: "id",
      senderId: "sender",
      recipientId: "recipient",
    },
  });
  console.log("solveRes", solveRes);

  return solveRes;
};

exports.acceptFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndUpdate(requestId, {
    status: "accepted",
  }).lean();
  return request;
};

exports.declineFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndUpdate(requestId, {
    status: "declined",
  })
    .lean()
    .populate({
      path: "recipientId",
      select: "_id firstName lastName",
    });
  console.log("request at decline friend req", request);

  const transformMap = {
    _id: { newKey: "id" },
    recipientId: { newKey: "recipient", nestedKey: { _id: { newKey: "id" } } },
  };

  const solveReq = transformObj(request, transformMap);

  return solveReq;
};

exports.withdrawFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndDelete(requestId).lean();
  return request;
};
