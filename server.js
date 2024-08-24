const app = require("./app");
const { setInterval } = require("node:timers/promises");
require("dotenv").config();
const port = process.env.PORT || 8000;
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");

const { initIo, ioEvents, instance } = require("./socket");
const connectDB = require("./config/DBconn");
const verifyIO = require("./middlewares/verifyIO");
const connectHandler = require("./socketHandlers/connectHandler");
const relationShipHandler = require("./socketHandlers/relationShipHandler");
const conversationHandler = require("./socketHandlers/conversationHandler");
const messageHandler = require("./socketHandlers/messageHandler");
const callHandler = require("./socketHandlers/callHandler");
const verifyUserForCall = require("./middlewares/VerifyUserForCall");

instance.initIo(server);
const io = instance.getIO();

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const mainNamespace = io.of("/");
mainNamespace.use(verifyIO);
mainNamespace.on("connection", (socket) => {
  connectHandler(io, socket);
  relationShipHandler(io, socket);
  conversationHandler(io, socket);
  messageHandler(io, socket);
});

// client disconnect namespace when they out of video chat or accidental shut up tab
// if i use only main namespace, when you left video chat, they must emit a my event is left_room
// this event was emit when cleanup function of useEffect run, but when accidental shut up tab, cleanup not run
const callNamespace = io.of("/call");
callNamespace.use(verifyUserForCall);
callNamespace.on("connection", (socket) => {
  callHandler(io, socket);
});

connectDB();

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");

  server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
});

mongoose.connection.on("error", (err) => {
  console.log(err);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
