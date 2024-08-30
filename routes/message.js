const router = require("express").Router();
const messageController = require("../controllers/message");
const authController = require("../controllers/auth");
const uploadFiles = require("../controllers/uploadMsgs");
const multer = require("multer");
const {
  maxNumberOfFiles,
  maxSize,
  allowFileTypes,
  allowFileExts,
} = require("../config/conversation");
const { chatTypes } = require("../config/conversation");
const verifyJWT = require("../middlewares/verifyJWT");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: maxSize,
    files: maxNumberOfFiles,
    // docs not talk more about this property, but it default is infinity, so i limit it with random number
    fields: 20,
    parts: 100,
  },
  fileFilter: function fileFilter(req, file, cb) {
    const { mimetype, originalname } = file;
    console.log("at options of multer", file);

    const isValidType = allowFileTypes.includes(mimetype);

    const ext = originalname.substring(originalname.lastIndexOf("."));
    const isVAlidExt = allowFileExts.includes(ext);

    // To accept the file pass `true`, like so:
    if (isValidType && isVAlidExt) {
      console.log("valid", file);
      cb(null, true);
    } else {
      console.log("invalid", file);

      // To reject this file pass `false`, like so:
      cb(null, false);
    }
  },
});

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
  upload.array("message-files", maxNumberOfFiles),
  uploadFiles
);

module.exports = router;
