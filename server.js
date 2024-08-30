const { setInterval } = require("node:timers/promises");
require("dotenv").config();
const http = require("http");
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

const port = process.env.PORT || 8000;

connectDB();

const app = require("./app");
const server = http.createServer(app);

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");

  server.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
});

mongoose.connection.on("error", (err) => {
  console.log(err);
});

instance.initIo(server);
const io = instance.getIO();

const mainNsp = io.of("/");
mainNsp.use(verifyIO);
mainNsp.on("connection", (socket) => {
  connectHandler(io, socket);
  relationShipHandler(io, socket);
  conversationHandler(io, socket);
  messageHandler(io, socket);
});

// client disconnect namespace when they out of video chat or accidental shut up tab
// if i use only main namespace, when you left video chat, they must emit a my event is left_room
// this event was emit when cleanup function of useEffect run, but when accidental shut up tab, cleanup not run
const callNsp = io.of("/call");
callNsp.use(verifyUserForCall);
callNsp.on("connection", (socket) => {
  callHandler(io, socket);
});

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
