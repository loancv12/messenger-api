const jwt = require("jsonwebtoken");
require("dotenv").config();
const otpGenerator = require("otp-generator");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const otpTemplate = require("../Templates/Mail/otp");
//

const User = require("../models/User");
const filterObj = require("../utils/filterObj");
const mailService = require("../services/mailer");
const makeMsgForRes = require("../utils/msgForRes");

// signup => register => send OTP => verified OTP

// Register
exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email and password are required"));

  let filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email"
  );
  // Check verify user with given email
  const existing_user = await User.findOne({ email });
  if (existing_user && existing_user.verified)
    return res
      .status(409)
      .json(makeMsgForRes("error", "Email is already used"));
  if (existing_user) {
    // because bcrypt make diff hash with same input,
    // so incase pwd is the same, password not isModified, bcrypt not hash, pwd will be stored in db in plain text
    // to prevent this, check is samepwd,
    const isSamePwdAsPrev = await existing_user.correctPassword(
      password,
      existing_user.password
    );

    if (isSamePwdAsPrev) {
      const { password, ...rest } = filteredBody;
      filteredBody = rest;
    }

    await User.findOneAndUpdate({ email }, filteredBody, {
      new: true,
      runValidators: true,
    });

    // generate OTP and send email to user
    req.userId = existing_user._id;
    next();
  } else {
    // if user record not avaible
    const new_user = await User.create(filteredBody);

    // generate OTP and send email to user
    req.userId = new_user._id;
    next();
  }
};

exports.resendOTP = async (req, res, next) => {
  const { email } = req.body;

  if (!email)
    return res.state(400).json(makeMsgForRes("error", "Email is required"));

  const user = await User.findOne({ email, verified: false }).exec();
  if (!user)
    return res
      .state(400)
      .json(
        makeMsgForRes(
          "error",
          "User not found or this user is already verified"
        )
      );

  // generate OTP and send email to user
  req.userId = user._id;
  next();
};
// send OTP
exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator
    .generate(6, {
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    })
    .toString();

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; //10 mins after OTP is sent
  console.log("new_otp", new_otp);

  const user = await User.findById(userId);
  user.otp = new_otp;
  user.otp_expiry_time = otp_expiry_time;
  await user.save();

  await mailService
    .sendMail({
      from: "contact@tawk.com",
      to: "example@gmail.com",
      subject: "OTP for login",
      // text: `Your OTP is ${new_otp}`,
      html: otpTemplate(user.firstName, new_otp),
    })
    .then(() => {
      res.status(200).json(
        makeMsgForRes("success", "OTP sent successfully!", {
          email: user.email,
        })
      );
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json(makeMsgForRes("error", "Server wrong!"));
    });
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email and otp are required"));

  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email is Invalid or OTP expired"));

  const isCorrectOtp = await user.correctOTP(otp, user.otp);

  if (!isCorrectOtp)
    return res.status(400).json(makeMsgForRes("error", "OTP not correct"));

  // OTP is correct
  user.verified = true;
  user.otp = undefined;
  user.otp_expiry_time = undefined;

  await user.save({ validateModifiedOnly: true });

  const token = signToken(user._id, user.email);
  res
    .status(200)
    .json(makeMsgForRes("success", "OTP verified successfully", token));
};

// login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email and password are required"));

  const foundUser = await User.findOne({ email }).select("+password");
  if (!foundUser)
    return res.status(400).json(makeMsgForRes("error", "User not found"));

  const isCorrectPwd = await foundUser.correctPassword(
    password,
    foundUser.password
  );
  if (!isCorrectPwd)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Email or Password is incorrect"));

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
  let newRefreshTokenArray = !cookies?.jwt
    ? foundUser.refreshTokens // first time login
    : // incase that this user login sw, and someone else/ this user use old token,
      // and some browsers use session restoring when restarting. This can cause session cookies to last indefinitely.
      foundUser.refreshTokens.filter((rft) => rft !== cookies?.jwt);

  // incase old token was use
  if (cookies?.jwt) {
    const oldRefreshToken = cookies.jwt;
    // incase old token was use by foundUser, not logout or refresh so token still there
    const foundToken = await User.findOne({
      refreshTokens: { $in: [oldRefreshToken] },
    }).exec();

    // no one have this token, => token was use by strange user, not foundUser, so not provide any token
    if (!foundToken) {
      // clear out ALL previous refresh tokens
      newRefreshTokenArray = [];
    }

    // clear old cookie in browser
    res.clearCookie("jwt", {
      http: true,
      // sameSite: "None",
      // secure: true,
    });
  }

  // // Saving refreshToken with current user
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
  const test = JSON.stringify({
    message: "Login successfully",
    data: accessToken,
  });
  //makeMsgForRes("success", "Login successfully", accessToken)
  res.status(200).json({
    message: "Login successfully",
    data: accessToken,
  });
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

  res.clearCookie("jwt", {
    httpOnly: true,
    // sameSite: "None",
    // secure: true,
  });
  res.json(makeMsgForRes("success", "Logout successfully"));
};

exports.forgetPassword = async (req, res, next) => {
  // get the users email
  const { email } = req.body;
  if (!email)
    return res.status(400).json(makeMsgForRes("error", "Email is required"));

  const user = await User.findOne({ email });
  if (!user)
    return res
      .status(400)
      .json(makeMsgForRes("error", "User not found with given email address"));

  // generate a random reset token
  const resetToken = user.createPasswordResetToken();

  try {
    const resetURL = `https://tawk.com/auth/reset-password?token=${resetToken}`;
    // TODO => send email with reset url

    await mailService.sendMail({
      from: "contact@tawk.com",
      to: "example@gmail.com",
      subject: "Reset password",
      text: `Click here to reset password : ${resetURL}`,
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
  // get the user based on token
  const { token: resetToken, password } = req.body;
  if (!password || !resetToken)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Token and your new password is required"));

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // if token has expired or submission is out of time window
  if (!user)
    return res
      .status(400)
      .json(makeMsgForRes("error", "Wrong token or token expired"));

  // update users password and set resetToken $ expiry to undefined
  // TODO=> check isSamePwd
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passWordChangeAt = Date.now();

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // login the user and send new JWT

  // TODO send an email to user informing about password reset
  const token = signToken(user._id, user.email);
  res
    .status(200)
    .json(makeMsgForRes("success", "Reset password successfully", token));
};
