const GroupConversation = require("../models/GroupConversation");
const GroupMessage = require("../models/GroupMessage");
const DirectConversation = require("../models/DirectConversation");
const DirectMessage = require("../models/DirectMessage");

const chatTypes = {
  DIRECT_CHAT: "direct_chat",
  GROUP_CHAT: "group_chat",
};
const cvsDB = {
  [chatTypes.DIRECT_CHAT]: DirectConversation,
  [chatTypes.GROUP_CHAT]: GroupConversation,
};

const msgDB = {
  [chatTypes.DIRECT_CHAT]: DirectMessage,
  [chatTypes.GROUP_CHAT]: GroupMessage,
};

exports.chatTypes = chatTypes;

exports.cvsDB = cvsDB;
exports.msgDB = msgDB;

exports.msgModels = {
  [chatTypes.DIRECT_CHAT]: "DirectMessage",
  [chatTypes.GROUP_CHAT]: "GroupMessage",
};

exports.msgsLimit = 20;
exports.maxNumberOfFiles = 6;
exports.msgInterval = 30; //30 mins
const imageFileTypesWithMIME = [
  { extension: ".heic", mimeType: "image/heic", notWideSp: true }, // =>not show not type
  { extension: ".heif", mimeType: "image/heif", notWideSp: true }, // 5m not show not type
  { extension: ".jp2", mimeType: "image/jp2", notWideSp: true }, // not show not type
  {
    extension: ".psd",
    mimeType: "image/vnd.adobe.photoshop",
    notWideSp: true,
  }, // not show not type
  { extension: ".tiff", mimeType: "image/tiff", notWideSp: true }, // not show, have type
  //
  { extension: ".webp", mimeType: "image/webp", notWideSp: true }, //
  { extension: ".jfif", mimeType: "image/jpeg" }, //
  { extension: ".jpeg", mimeType: "image/jpeg" }, //
  { extension: ".jpg", mimeType: "image/jpeg" },
  { extension: ".png", mimeType: "image/png" }, //
];

const wordFileTypesWithMIME = [
  { extension: ".doc", mimeType: "application/msword" },
  {
    extension: ".docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];
exports.imageFileTypesWithMIME = imageFileTypesWithMIME;
exports.allowFileTypes = [...imageFileTypesWithMIME, ...wordFileTypesWithMIME];

// exports.allowFileTypes = [
//   "image/jpg",
//   "image/jpeg",
//   "image/png",
//   "application/msword",
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
// ];
// exports.allowFileExts = [".png", ".jpg", ".jpeg", ".doc", ".docx"];

exports.maxSize = 1024 * 1024 * 1; // 1e6 (1 MB)
exports.maxNumberOfFiles = 10;
