const Client = require("../models/Client");
const PersistMessage = require("../models/PersistMessage");
const makeMsgForRes = require("../utils/msgForRes");

exports.getPersistMessages = async (req, res) => {
  const { clientId } = req.body;

  if (!clientId)
    return res
      .status(400)
      .json(makeMsgForRes("error", "All field are required"));

  const ret = await PersistMessage.find({ clientId })
    .lean()
    .populate({
      path: "msgId",
      populate: {
        path: "replyMsgId",
        select: "_id text from isDeleted createdAt",
      },
    });

  res.json(makeMsgForRes("success", "Get persistMessage successfully", ret));
};

exports.createPersistMessages = async (req, res) => {
  const { clientId, msgIds, msgModel } = req.body;

  if (!clientId || !Array.isArray(msgIds) || msgIds.length || !msgModel)
    return res
      .status(400)
      .json(makeMsgForRes("error", "All field are required"));

  const ret = await PersistMessage.create(
    msgIds.map((msgId) => ({ clientId, msgId, msgModel, expireAt: new Date() }))
  );

  res.json(makeMsgForRes("success", "Create persistMessage successfully", ret));
};

exports.deletePersistMessages = async (req, res) => {
  const { clientId } = req.body;

  if (!clientId)
    return res
      .status(400)
      .json(makeMsgForRes("error", "All field are required"));

  const foundClient = await Client.findOne({ clientId }).lean();
  if (!foundClient)
    return res.status(400).json(makeMsgForRes("error", "Not found client"));

  const ret = await PersistMessage.deleteMany({ clientId }).lean();

  res.json(makeMsgForRes("success", "Delete persistMessage successfully"));
};
