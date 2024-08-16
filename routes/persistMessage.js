const router = require("express").Router();
const persistMessageController = require("../controllers/persistMessage");

router.get(
  "/get-persist-messages",
  persistMessageController.getPersistMessages
);
router.post(
  "/add-persist-messages",
  persistMessageController.createPersistMessages
);
router.delete(
  "/delete-persist-messages",
  persistMessageController.deletePersistMessages
);

module.exports = router;
