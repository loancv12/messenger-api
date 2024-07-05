const router = require("express").Router();
const authRoute = require("./auth");
const userRoute = require("./user");
const conversationRoute = require("./conversation");
const messageRoute = require("./message");

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/conversation", conversationRoute);
router.use("/message", messageRoute);

module.exports = router;
