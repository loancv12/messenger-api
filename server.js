const app = require("./app");
require("dotenv").config();
const port = process.env.PORT || 8000;
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");

const { initIo, ioEvents, instance } = require("./socket");
const connectDB = require("./config/DBconn");

instance.initIo(server);
const io = instance.getIO();

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

io.on("connection", ioEvents(io));

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
