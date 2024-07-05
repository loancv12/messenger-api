const whitelist = require("./whitelist");

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  exposedHeaders: "x-pagination",
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
