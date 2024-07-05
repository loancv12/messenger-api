const router = require("express").Router();
const conversationController = require("../controllers/conversation");
const authController = require("../controllers/auth");
const { chatTypes } = require("../config/conversation");
const verifyJWT = require("../middlewares/verifyJWT");

router.get(
  `/get-conversations/${chatTypes.DIRECT_CHAT}`,
  verifyJWT,
  conversationController.getDirectConversations
);

router.get(
  `/get-conversations/${chatTypes.GROUP_CHAT}`,
  verifyJWT,
  conversationController.getGroupConversations
);

router.get(
  "/get-join-group-reqs",
  verifyJWT,
  conversationController.getJoinGroupReqs
);

module.exports = router;
