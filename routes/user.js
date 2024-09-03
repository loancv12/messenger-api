const router = require("express").Router();
const userController = require("../controllers/user");
const verifyJWT = require("../middlewares/verifyJWT");

router.get("/get-me", verifyJWT, userController.getMe);
router.patch("/update-me", verifyJWT, userController.updateMe);
router.get("/get-users", verifyJWT, userController.getUsers);
router.get("/get-friends", verifyJWT, userController.getFriends);
router.get("/get-friend-requests", verifyJWT, userController.getRequests);

module.exports = router;
