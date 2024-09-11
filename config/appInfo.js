const productionBaseUrl = "https://messenger-mjqq.onrender.com";
const devBaseUrl = "http://localhost:5173";
const currBaseUrl =
  process.env.NODE_ENV === "development" ? devBaseUrl : productionBaseUrl;

exports.appName = "Messenger";
exports.productionBaseUrl = productionBaseUrl;
exports.devBaseUrl = devBaseUrl;
exports.currBaseUrl = currBaseUrl;
