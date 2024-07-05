const router = require("express").Router();
const messageController = require("../controllers/message");
const authController = require("../controllers/auth");
const uploadFiles = require("../controllers/uploadMsgs");
const multer = require("multer");
const { maxNumberOfFiles } = require("../config/conversation");
const upload = multer({ dest: "./public/data/uploads/" });
const { chatTypes } = require("../config/conversation");
const verifyJWT = require("../middlewares/verifyJWT");

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
  upload.array("message-files", maxNumberOfFiles),
  verifyJWT,
  uploadFiles
);

module.exports = router;
