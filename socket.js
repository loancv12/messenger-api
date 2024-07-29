const { Server } = require("socket.io");
const whitelist = require("./config/whitelist");

class SocketIOService {
  static #io;
  static #instance;

  constructor() {
    // Private constructor ensures singleton instance
    if (!SocketIOService.#instance) {
      SocketIOService.#instance = this;
    }
    return SocketIOService.#instance;
  }
  initIo(server) {
    SocketIOService.#io = new Server(server, {
      connectionStateRecovery: {
        // the backup duration of the sessions and the packets
        maxDisconnectionDuration: 2 * 60 * 1000,
      },
      cors: {
        // i try allowRequest, but it no work
        origin: whitelist,
      },
    });
    return SocketIOService.#io;
  }

  ready() {
    return SocketIOService.#io !== null;
  }

  getIO() {
    if (!SocketIOService.#io) {
      throw new Error("IO server requested before initialization");
    }
    return SocketIOService.#io;
  }
}

const instance = new SocketIOService();
Object.freeze(instance);

const errorHandler = (socket, handler) => {
  const handleError = (err) => {
    console.log(err);
    const reason = err?.response?.data?.message ?? err.message;
    socket.emit("errormy", reason);
  };

  return (...args) => {
    try {
      const ret = handler.apply(this, args);
      if (ret && typeof ret.catch === "function") {
        // async handler
        ret.catch(handleError);
      }
    } catch (e) {
      // sync handler
      handleError(e);
    }
  };
};

exports.instance = instance;
exports.errorHandler = errorHandler;
