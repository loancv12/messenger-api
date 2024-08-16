const router = require("express").Router();
const authRoute = require("./auth");
const userRoute = require("./user");
const conversationRoute = require("./conversation");
const messageRoute = require("./message");
const clientRoute = require("./client");
const persistMessageRoute = require("./persistMessage");

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/conversation", conversationRoute);
router.use("/message", messageRoute);
router.use("/client", clientRoute);
router.use("/persist-message", persistMessageRoute);

module.exports = router;
