const jwt = require("jsonwebtoken");
const makeMsgForRes = require("../utils/msgForRes");

const verifyJWT = (req, res, next) => {
  const authHeaders = req.headers.authorization || req.headers.Authorization;

  if (!authHeaders?.startsWith("Bearer"))
    return res.status(401).json(makeMsgForRes("error", "Unauthorized"));

  const accessToken = authHeaders.split(" ")[1];

  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    console.log("verify JWT", err);
    if (err) return res.status(403).json(makeMsgForRes("error", "Forbidden"));
    req.user = { userId: decoded.userInfo.userId };
    next();
  });
};

module.exports = verifyJWT;
