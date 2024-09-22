const Client = require("../models/Client");
const PersistMessage = require("../models/PersistMessage");
const makeMsgForRes = require("../utils/msgForRes");
const { v4: uuidv4 } = require("uuid");

exports.createClient = async (req, res) => {
  const { userId, clientId } = req.body;

  if (!userId || !clientId)
    return res
      .status(400)
      .json(makeMsgForRes("error", "All field are required"));

  const foundClient = await Client.findOne({ userId, clientId }).lean();

  if (foundClient) {
    // create new clientId and send it to fe
    const clientIdGeneratedFromServer = uuidv4();
    const ret = await Client.create({
      userId,
      clientId: clientIdGeneratedFromServer,
      expireAt: new Date(),
    });

    return res.json(
      makeMsgForRes("error", "Duplicate clientId", clientIdGeneratedFromServer)
    );
  }

  const ret = await Client.create({ userId, clientId, expireAt: new Date() });

  res.json(makeMsgForRes("success", "Create client successfully", ret));
};

exports.addSocket = async (req, res) => {
  const { clientId, socketId } = req.body;
  if (!clientId || !socketId)
    return res
      .status(400)
      .json(makeMsgForRes("error", "All field are required"));

  const ret = await Client.findOneAndUpdate(
    { clientId },
    { socketId },
    {
      new: true,
    }
  ).lean();

  res.json(makeMsgForRes("success", "Delete client successfully"));
};

exports.deleteClient = async (req, res) => {
  const { clientId } = req.body;
  if (!clientId)
    return res
      .status(400)
      .json(makeMsgForRes("error", "All field are required"));

  const ret = await Client.findOneAndDelete({ clientId }).lean();
  await PersistMessage.deleteMany({ clientId });

  res.json(makeMsgForRes("success", "Delete client successfully"));
};
