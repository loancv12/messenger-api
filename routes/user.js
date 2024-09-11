const router = require("express").Router();
const userController = require("../controllers/user");
const verifyJWT = require("../middlewares/verifyJWT");
const { uploadAvatar } = require("../services/uploadFiles");

router.get("/get-me", verifyJWT, userController.getMe);
router.post(
  "/update-me",
  verifyJWT,
  uploadAvatar.single("avatar"),
  userController.updateMe
);
router.get("/get-users", verifyJWT, userController.getUsers);
router.get("/get-friends", verifyJWT, userController.getFriends);
router.get("/get-friend-requests", verifyJWT, userController.getRequests);

module.exports = router;
