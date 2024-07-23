const router = require("express").Router();
const authController = require("../controllers/auth");

router.post("/login", authController.login);
router.get("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/register", authController.register, authController.sendOTP);
router.post("/resend-otp", authController.resendOTP, authController.sendOTP);
router.post("/send-otp", authController.sendOTP);

router.post("/verify-otp", authController.verifyOTP);
router.post("/forgot-password", authController.forgetPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
