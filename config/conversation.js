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

exports.msgsLimit = 20;
exports.maxNumberOfFiles = 10;
exports.msgInterval = 30; //30 mins

exports.allowFileTypes = [
  "image/jpg",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
exports.allowFileExts = [".png", ".jpg", ".jpeg", ".doc", ".docx"];
// the file in my pc is 691,793byte 675 KB, the result i get is 691793, so convertor factor is 1024.
exports.maxSize = 1024 * 1024 * 1; // 1e6 (1 MB)
exports.maxNumberOfFiles = 10;
