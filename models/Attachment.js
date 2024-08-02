const { default: mongoose } = require("mongoose");

const Attachment = new mongoose.Schema({
  link: {
    type: String,
    default: "",
  },
  alt: {
    type: String,
    default: "",
  },
});

module.exports = Attachment;
