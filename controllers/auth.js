const jwt = require("jsonwebtoken");
require("dotenv").config();
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const otpTemplate = require("../Templates/Mail/otp");
const resetLinkTemplate = require("../Templates/Mail/resetLink");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
//

const User = require("../models/User");
const filterObj = require("../utils/filterObj");
const { sendMail } = require("../services/mailer");
const makeMsgForRes = require("../utils/msgForRes");
const Client = require("../models/Client");
const PersistMessage = require("../models/PersistMessage");
const { googleEndpoints, getUserInfo } = require("../services/google");
const getFullName = require("../utils/getFullName");
const { currBaseUrl } = require("../config/appInfo");

// Register
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  // validate fields
  if (!firstName || !lastName || !email || !password)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email and password are required"));

  // Check duplicate with email verified
  const foundUser = await User.findOne({ email });
  if (foundUser && foundUser.verified)
    return res
      .status(409)
      .json(makeMsgForRes("error", "Email is already used"));

  // hash pwd
  const hashPwd = await bcrypt.hash(password, 12);

  // create new user
  if (!foundUser) {
    const newUser = await User.create({
      password: hashPwd,
      firstName,
      lastName,
      email,
    });

    req.userId = newUser._id;
  } else {
    // update fields
    await User.findOneAndUpdate(
      { email },
      { password: hashPwd, firstName, lastName, email }
    ).lean();
    req.userId = foundUser._id;
  }

  // turn to sendOtp mdw
  next();
};

exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  // create otp
  const newOtp = otpGenerator
    .generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    })
    .toString();

  const otpExpiryTime = Date.now() + 10 * 60 * 1000; //10 mins after OTP is sent
  console.log("newOtp", newOtp);

  // hash otp
  const hashOtp = await bcrypt.hash(newOtp, 12);

  // update otp at db
  const user = await User.findByIdAndUpdate(
    userId,
    {
      otp: hashOtp,
      otp_expiry_time: otpExpiryTime,
    },
    {
      select: "firstName lastName email",
    }
  ).exec();

  try {
    // send mail
    await sendMail({
      to: user.email,
      toName: getFullName(user),
      subject: "OTP for login",
      text: `Your OTP is ${newOtp}`,
      html: otpTemplate(user.firstName, newOtp),
    });

    res.status(200).json(
      makeMsgForRes("success", "OTP sent successfully!", {
        email: user.email,
      })
    );
  } catch (err) {
    console.log(err);
    user.otp = undefined;
    user.otp_expiry_time = undefined;

    await user.save({ validateBeforeSave: false });
    res.status(500).json(makeMsgForRes("error", "Send otp failed"));
  }
};

exports.resendOTP = async (req, res, next) => {
  const { email } = req.body;

  // check field validate
  if (!email)
    return res.status(400).json(makeMsgForRes("error", "Email is required"));

  // check user exist
  const user = await User.findOne({ email, verified: false }).lean();
  if (!user)
    return res
      .status(400)
      .json(
        makeMsgForRes(
          "error",
          "User not found or this user is already verified"
        )
      );

  req.userId = user._id;
  // turn to sendOtp mdw
  next();
};

exports.verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;
  // validate fields
  if (!email || !otp)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email and otp are required"));

  // check user exist and otp is expired
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email is Invalid or OTP expired"));

  // check otp is correct
  const isCorrectOtp = await user.correctOTP(otp, user.otp);

  if (!isCorrectOtp)
    return res.status(400).json(makeMsgForRes("error", "OTP not correct"));

  // update user in db
  user.verified = true;
  user.otp = undefined;
  user.otp_expiry_time = undefined;

  await user.save({ validateModifiedOnly: true });

  res.status(200).json(makeMsgForRes("success", "OTP verified successfully"));
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({
      status: "error",
      message: "Email and password are required",
    });

  // check user exist
  const foundUser = await User.findOne({ email }).select("+password");
  if (!foundUser)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email and password are required"));

  // check user verified
  if (!foundUser.verified)
    return res
      .status(400)
      .json(
        makeMsgForRes(
          "error",
          "Your email is not verified. Please verified it or register it again"
        )
      );

  // check correct email and password
  const isCorrectPwd = await foundUser.correctPassword(
    password,
    foundUser.password
  );

  if (!isCorrectPwd)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email or Password is incorrect"));

  // create at and rt
  const accessToken = jwt.sign(
    {
      userInfo: {
        userId: foundUser._id.toString(),
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: "15m",
    }
  );

  const newRefreshToken = jwt.sign(
    {
      userInfo: {
        userId: foundUser._id.toString(),
      },
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    }
  );

  const cookies = req.cookies;
  let newRefreshTokenArray;
  // incase old token was use: remove use old refresh token
  if (cookies?.jwt) {
    const oldRefreshToken = cookies.jwt;

    const foundToken = await User.findOne({
      refreshTokens: { $in: [oldRefreshToken] },
    }).exec();

    // no one have this token, => token was use by strange user, not foundUser, so not provide any token
    if (!foundToken) {
      newRefreshTokenArray = [];
    } else {
      // incase old token was use by foundUser, not logout or refresh so token still there
      // make old session invalid (in FE, login again was prevented)
      newRefreshTokenArray = foundUser.refreshTokens.filter(
        (rft) => rft !== cookies?.jwt
      );
    }

    // clear old cookie in browser
    res.clearCookie("jwt", {
      http: true,
      // sameSite: "None",
      // secure: true,
    });
  } else {
    // first time login, no rt found
    newRefreshTokenArray = foundUser.refreshTokens;
  }

  // Saving refreshToken with current user
  foundUser.online = true;
  foundUser.refreshTokens = [...newRefreshTokenArray, newRefreshToken];
  await foundUser.save();

  // Creates Secure Cookie with refresh token
  res.cookie("jwt", newRefreshToken, {
    httpOnly: true,
    // secure: true, //https
    // sameSite: "None", //cross-site cookie
    maxAge: 7 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
  });

  res
    .status(200)
    .json(makeMsgForRes("success", "Login successful", accessToken));
};

exports.loginWithGg = async (req, res, next) => {
  const { codeResponse } = req.body;
  const { code } = codeResponse;

  const profile = await getUserInfo(code);

  if (profile && profile.sub && profile.email) {
    // make sure that email was verified
    const {
      sub,
      name,
      given_name: firstName,
      family_name: lastName,
      picture: avatar,
      email,
      email_verified: emailVerified,
    } = profile;
    if (!emailVerified)
      return res
        .status(404)
        .json(makeMsgForRes("error", "Email of this account must be verified"));

    // check that user log in app before
    const existingUser = await User.findOne({
      provider: "google",
      email,
    });

    if (existingUser) {
      // update local db
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.avatar = avatar;
      await existingUser.save();
    } else {
      // create new user
      const password = sub;
      const newUser = await User.create({
        email,
        password,
        provider: "google",
        firstName,
        lastName,
        avatar,
        verified: true,
      });
    }

    req.body = {
      email,
      password: sub,
    };

    next();
  } else {
    return res.status(404).json(makeMsgForRes("error", "Profile not found"));
  }
};

exports.refresh = async (req, res, next) => {
  const cookies = req?.cookies;
  if (!cookies?.jwt)
    return res.status(401).json(makeMsgForRes("error", "Unauthorized"));
  const oldRefreshToken = cookies.jwt;

  // clear old cookie in browser
  res.clearCookie("jwt", {
    http: true,
    // sameSite: "None",
    // secure: true,
  });

  const foundUser = await User.findOne({
    refreshTokens: { $in: [oldRefreshToken] },
  }).exec();

  // detected refresh token reuse!
  if (!foundUser) {
    jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET),
      async (err, decoded) => {
        if (err) return res.sendStatus(403);
        // token still valid :<< but no one have this=>
        // user be hacked and be stolen token,
        const hackedUser = await User.findById(decoded.userInfo.userId).exec();
        hackedUser.refreshTokens = [];
        const result = await hackedUser.save();
      };
    return res.sendStatus(403);
  }

  // so with token, now change rfts array
  const newRefreshTokenArray = foundUser.refreshTokens.filter(
    (rft) => rft !== oldRefreshToken
  );

  jwt.verify(
    oldRefreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) {
        foundUser.refreshTokens = [...newRefreshTokenArray];
      }
      if (err || foundUser._id.toString() !== decoded.userInfo.userId) {
        return res.sendStatus(403);
      }

      // refresh token still valid, provide new acc and rotate refresh
      const accessToken = jwt.sign(
        {
          userInfo: {
            userId: foundUser._id.toString(),
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "15m",
        }
      );

      const newRefreshToken = jwt.sign(
        {
          userInfo: {
            userId: foundUser._id.toString(),
          },
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "7d",
        }
      );

      foundUser.refreshTokens = [...newRefreshTokenArray, newRefreshToken];
      await foundUser.save();

      res.cookie("jwt", newRefreshToken, {
        httpOnly: true,
        // secure: true, //https
        // sameSite: "None", //cross-site cookie
        maxAge: 7 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
      });

      res.json(
        makeMsgForRes(
          "sucess",
          "Get new access token successfully",
          accessToken
        )
      );
    }
  );
};

exports.logout = async (req, res, next) => {
  const { clientId } = req.body;
  const cookies = req.cookies;
  if (!cookies?.jwt)
    return res
      .status(204)
      .json(makeMsgForRes("success", "Logout successfully"));

  const refreshToken = cookies.jwt;
  const foundUser = await User.findOne({
    refreshTokens: { $in: refreshToken },
  }).exec();

  if (!foundUser) {
    res.clearCookie("jwt", {
      httpOnly: true,
      // sameSite: "None",
      // secure: true,
    });
    return res
      .status(204)
      .json(makeMsgForRes("success", "Logout successfully"));
  }

  foundUser.online = false;
  foundUser.refreshTokens = foundUser.refreshTokens.filter(
    (rft) => rft !== refreshToken
  );
  await foundUser.save();

  // clear all the persist msg of clientId
  await PersistMessage.deleteMany({
    clientId,
  });
  await Client.deleteOne({ clientId });

  res.clearCookie("jwt", {
    httpOnly: true,
    // sameSite: "None",
    // secure: true,
  });
  res.json(makeMsgForRes("success", "Logout successfully"));
};

exports.forgetPassword = async (req, res, next) => {
  const { email } = req.body;
  // validate field
  if (!email)
    return res.status(400).json(makeMsgForRes("error", "Email is required"));

  // check user exist
  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(400)
      .json(makeMsgForRes("error", "User not found with given email address"));

  // generate a random reset token
  const resetToken = user.createPasswordResetToken();

  try {
    // send mail
    const resetURL = `${currBaseUrl}/auth/reset-password?token=${resetToken}`;
    await sendMail({
      to: user.email,
      toName: getFullName(user),
      subject: "Reset password",
      text: `Reset password`,
      html: resetLinkTemplate(user.firstName, resetURL),
    });

    await user.save({ validateBeforeSave: false });

    res
      .status(200)
      .json(makeMsgForRes("success", "Reset password link sent to email"));
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });
    res
      .status(500)
      .json(
        makeMsgForRes(
          "error",
          "there was an error sending the email, please try latter"
        )
      );
  }
};

exports.resetPassword = async (req, res, next) => {
  const { token: resetToken, password } = req.body;

  // validate fields
  if (!password || !resetToken)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Token and your new password is required"));

  // check correct token
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // if token has expired or token not correct
  if (!user)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Wrong token or token expired"));

  // hash pwd
  const hashPwd = await bcrypt.hash(password, 12);

  // update at db and make all other session invalid
  user.password = hashPwd;
  user.passwordConfirm = hashPwd;
  user.passWordChangeAt = Date.now();
  user.refreshTokens = [];

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  res.status(200).json(makeMsgForRes("success", "Reset password successfully"));
};
