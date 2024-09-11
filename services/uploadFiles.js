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
    // docs not talk more about this property, but it default is infinity, so i limit it with random number
    fields: 20,
    parts: 100,
  },
  fileFilter: function fileFilter(req, file, cb) {
    const { mimetype, originalname } = file;
    console.log("at options of multer", file);
    const extension = originalname.substring(originalname.lastIndexOf("."));

    const isValidType = allowFileTypes.find(
      (allowType) =>
        allowType.extension === extension &&
        (allowType.mimeType === mimetype || allowType?.notWideSp)
    );

    console.log("isValidType", isValidType);
    cb(null, !!isValidType);
  },
});

exports.uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: maxSize,
    files: 1,
    // docs not talk more about this property, but it default is infinity, so i limit it with random number
    fields: 20,
    parts: 100,
  },
  fileFilter: function fileFilter(req, file, cb) {
    const { mimetype, originalname } = file;
    console.log("at options of multer", file);
    const extension = originalname.substring(originalname.lastIndexOf("."));

    const isValidType = imageFileTypesWithMIME.find(
      (allowType) =>
        allowType.extension === extension &&
        allowType.mimeType === mimetype &&
        !allowType.notWideSp
    );

    console.log("isValidType", file, isValidType);
    cb(null, !!isValidType);
  },
});
