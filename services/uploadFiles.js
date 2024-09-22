const multer = require("multer");
const {
  imageFileTypesWithMIME,
  allowFileTypes,
  maxSize,
  maxNumberOfFiles,
} = require("../config/conversation");

const storage = multer.memoryStorage();
exports.uploadMsg = multer({
  storage: storage,
  limits: {
    fileSize: maxSize,
    files: maxNumberOfFiles,
    fields: 20,
    parts: 100,
  },
  fileFilter: function fileFilter(req, file, cb) {
    const { mimetype, originalname } = file;
    const extension = originalname.substring(originalname.lastIndexOf("."));

    const isValidType = allowFileTypes.find(
      (allowType) =>
        allowType.extension === extension &&
        (allowType.mimeType === mimetype || allowType?.notWideSp)
    );

    cb(null, !!isValidType);
  },
});

exports.uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: maxSize,
    files: 1,
    fields: 20,
    parts: 100,
  },
  fileFilter: function fileFilter(req, file, cb) {
    const { mimetype, originalname } = file;
    const extension = originalname.substring(originalname.lastIndexOf("."));

    const isValidType = imageFileTypesWithMIME.find(
      (allowType) =>
        allowType.extension === extension &&
        allowType.mimeType === mimetype &&
        !allowType.notWideSp
    );

    cb(null, !!isValidType);
  },
});
