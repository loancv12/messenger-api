const { devBaseUrl, productionBaseUrl } = require("./appInfo");

const whitelist =
  process.env.NODE_ENV === "development" ? [devBaseUrl] : [productionBaseUrl];

module.exports = whitelist;
