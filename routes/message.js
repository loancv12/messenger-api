const router = require("express").Router();
const messageController = require("../controllers/message");
const uploadFiles = require("../controllers/uploadMsgs");
const { maxNumberOfFiles } = require("../config/conversation");
const { chatTypes } = require("../config/conversation");
const verifyJWT = require("../middlewares/verifyJWT");
const { uploadMsg } = require("../services/uploadFiles");

router.get(
  `/get-messages/${chatTypes.DIRECT_CHAT}`,
  verifyJWT,
  messageController.getDirectMessages
);

router.get(
  `/get-messages/${chatTypes.GROUP_CHAT}`,
  verifyJWT,
  messageController.getGroupMessages
);

router.post(
  "/upload-files",
  verifyJWT,
  uploadMsg.array("message-files", maxNumberOfFiles),
  uploadFiles
);

module.exports = router;
