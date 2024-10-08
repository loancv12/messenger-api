const mongoose = require("mongoose");
const { Schema } = mongoose;
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
    },
    avatar: {
      type: String,
    },
    // only user that login via social have this property, and the password was profileId
    provider: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Email name is required"],
      validate: {
        validator: function (v) {
          return /^\S+@\S+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email !`,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    passwordConfirm: {
      type: String,
    },
    passWordChangeAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },

    verified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otp_expiry_time: {
      type: Date,
    },

    online: {
      type: Boolean,
    },
    refreshTokens: [String],
  },
  { timestamps: true }
);

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
  return await bcrypt.compare(candidateOTP, userOTP);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10mis after the token expired

  return resetToken;
};

const User = new mongoose.model("User", userSchema);

module.exports = User;
