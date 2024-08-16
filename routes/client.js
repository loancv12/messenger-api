const router = require("express").Router();
const clientController = require("../controllers/client");

router.post("/create-client", clientController.createClient);
router.post("/add-socket", clientController.addSocket);
router.delete("/delete-client", clientController.deleteClient);

module.exports = router;
