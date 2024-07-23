const app = require("./app");
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

instance.initIo(server);
const io = instance.getIO();

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

io.use(verifyIO);
const onConnection = (socket) => {
  connectHandler(io, socket);
  relationShipHandler(io, socket);
  conversationHandler(io, socket);
  messageHandler(io, socket);
};
io.on("connection", onConnection);
let i = 0;
// setInterval(() => {
//   i++;
//   io.emit("ping", `value of i: ${i}`);
// }, 2000);

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
