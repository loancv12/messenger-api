const mongoose = require("mongoose");
const User = require("../models/User");
const FriendShip = require("../models/FriendShip");
const {
  transformObj,
  replaceId,
  transformId,
  transformFriendReq,
} = require("../utils/transform");
const makeMsgForRes = require("../utils/msgForRes");
const { uploadFileToFb } = require("../services/firebase");

exports.getMe = async (req, res, next) => {
  const { userId } = req.user;

  const userInfo = await User.findById(
    userId,
    "firstName lastName online avatar"
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
  const { userId } = req.user;
  const { file } = req;
  const { firstName, lastName } = req.body;
  console.log("file", file);
  let link = "";
  if (file) {
    // upload to fire storage and db
    const { originalname, mimetype, size, buffer } = file;

    const ext = originalname.substring(originalname.lastIndexOf("."));

    const blobFile = new Blob([buffer]);

    const path = `message/${Date.now().toString()}`;
    const name = `${path}.${ext}`;
    const metadata = {
      contentType: mimetype,
      name,
      size,
    };

    link = await uploadFileToFb({
      path,
      blobFile,
      metadata,
    });
  }

  // // create new messages and populate,
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      firstName,
      lastName,
      avatar: link,
    },
    {
      new: true,
      runValidators: true,
      select: "firstName lastName avatar online",
    }
  ).lean();

  const solveUser = transformObj(updatedUser, transformId);
  res
    .status(200)
    .json(makeMsgForRes("success", "Profile Updated successfully", solveUser));
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
    .select("firstName lastName avatar online")
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
    .populate({
      path: "recipientId",
      select: "firstName lastName avatar online",
    })
    .populate({ path: "senderId", select: "firstName lastName avatar online" });

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
      select: "firstName lastName avatar online",
    })
    .populate({ path: "senderId", select: "firstName lastName avatar online" });

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
    select: "firstName lastName avatar online",
  });
  await res.populate({
    path: "recipientId",
    select: "firstName lastName avatar online",
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
      select: "firstName lastName avatar online",
    })
    .populate({
      path: "recipientId",
      select: "firstName lastName avatar online",
    });

  return transformObj(request, transformFriendReq);
};

exports.declineFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndDelete(requestId)
    .lean()
    .populate({
      path: "senderId",
      select: "firstName lastName avatar online",
    })
    .populate({
      path: "recipientId",
      select: "firstName lastName avatar online",
    });

  return transformObj(request, transformFriendReq);
};

exports.withdrawFriendReq = async ({ requestId }) => {
  const request = await FriendShip.findByIdAndDelete(requestId)
    .lean()
    .populate({
      path: "senderId",
      select: "firstName lastName avatar online",
    })
    .populate({
      path: "recipientId",
      select: "firstName lastName avatar online",
    });

  return transformObj(request, transformFriendReq);
};
