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

    socket_id: {
      type: String,
    },

    online: {
      type: Boolean,
    },
    refreshTokens: [String],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  console.log("hash otp", this.otp);
  // Only run this function is otp is actually modified
  if (!this.isModified("otp")) return next();

  if (this.otp) {
    this.otp = await bcrypt.hash(this.otp, 12);
  }

  // next();
});

userSchema.pre("save", async function (next) {
  console.log("hash password", this.password);

  if (!this.isModified("password")) return next();
  // hash the password with the cost of 12

  this.password = await bcrypt.hash(this.password, 12);

  // next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
  console.log("otp", candidateOTP, userOTP);
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

userSchema.methods.changedPasswordAfter = function (timestamp) {
  // console.log("timestamp", timestamp);
  // console.log("utc", new Date(timestamp * 1000).toUTCString());
  const passwordChangeTimes = Date.parse(this.passWordChangeAt);
  // console.log("this.passWordChangeAt", passwordChangeTimes);
  return timestamp * 1000 < passwordChangeTimes;
};

const User = new mongoose.model("User", userSchema);

module.exports = User;
