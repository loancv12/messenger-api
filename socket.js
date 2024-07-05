const { Server } = require("socket.io");
const User = require("./models/user");
const FriendRequest = require("./models/FriendShip");
const { msgDB } = require("./config/conversation");
const GroupConversation = require("./models/GroupConversation");
const { chatTypes } = require("./config/conversation");
const {
  startConversation,
  createGroup,
  addMember,
} = require("./controllers/conversation");
const JoinGroupRequest = require("./models/JoinGroupRequest");
const { deleteMsg, createTextMsg } = require("./controllers/message");
const {
  makeFriendReq,
  acceptFriendReq,
  declineFriendReq,
  withdrawFriendReq,
} = require("./controllers/user");
const GroupUserRelation = require("./models/GroupUserRelation");

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
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
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

exports.instance = instance;

const emitToFromAndTo = async function (io, to, from) {
  const toUser = await User.findById(to.id, "socket_id");
  const fromUser = await User.findById(from.id, "socket_id");

  io.to(toUser.socket_id).emit(to.event, to.payload);
  io.to(fromUser.socket_id).emit(from.event, from.payload);
};

exports.emitToFromAndTo = emitToFromAndTo;

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

exports.ioEvents = (io) => {
  return async (socket) => {
    // ...
    const userId = socket.handshake.query["userId"];

    const socket_id = socket.id;

    console.log("userId", userId, typeof userId);
    console.log("socket_id", socket_id);

    if (userId !== "null" && userId !== "undefined") {
      try {
        const user = await User.findByIdAndUpdate(userId, {
          socket_id,
          status: "Online",
        });
        if (user) {
          io.sockets.emit("online", userId);
          const groups = await GroupConversation.find({
            participants: { $all: [userId] },
          }).lean();
          if (groups) {
            groups.forEach((group) => {
              socket.join(group._id.toString());
            });
          }
          // socket event here

          // handle friend request
          // make friend req
          socket.on(
            "make_friend_request",
            errorHandler(socket, async (data, callback) => {
              console.log("make_friend_request", data);
              const { to, from } = data;

              const res = await makeFriendReq({ to, from });
              console.log("make Friend req", res);

              await emitToFromAndTo(
                io,
                {
                  id: to,
                  event: "new_friend_req",
                  payload: {
                    message: "New Friend request received",
                    newFriendRequest: res,
                  },
                },
                {
                  id: from,
                  event: "send_req_ret",
                  payload: {
                    message: "Request sent successfully",
                    newFriendRequest: res,
                  },
                }
              );
            })
          );

          // accept
          socket.on(
            "accept_friend_req",
            errorHandler(socket, async (data) => {
              const { requestId } = data;

              const request = await acceptFriendReq({ requestId });

              const payload = {
                message: "Friend request accepted",
                request,
              };
              await emitToFromAndTo(
                io,
                {
                  id: request.senderId,
                  event: "friend_req_accepted_ret",
                  payload,
                },
                {
                  id: request.recipientId,
                  event: "friend_req_accepted_ret",
                  payload,
                }
              );
            })
          );

          //decline
          socket.on(
            "decline_friend_req",
            errorHandler(socket, async (data) => {
              const { requestId } = data;

              const request = await declineFriendReq({ requestId });

              await emitToFromAndTo(
                io,
                {
                  id: request.senderId,
                  event: "friend_req_decline_ret",
                  payload: {
                    message: `${request.recipient.firstName} ${request.recipient.lastName} declined your friend request`,
                    request,
                  },
                },
                {
                  id: request.recipient.id,
                  event: "friend_req_decline_ret",
                  payload: {
                    message: "Decline friend request successful",
                  },
                }
              );
            })
          );

          // withdraw
          socket.on(
            "withdraw_friend_req",
            errorHandler(socket, async (data) => {
              const { requestId } = data;

              const request = await withdrawFriendReq({ requestId });

              socket.emit("withdraw_friend_req_ret", {
                message: "Friend request withdraw successful",
              });
            })
          );

          // conversation
          // start cvs, only direct cvs
          socket.on(
            "start_conversation",
            errorHandler(socket, async (data) => {
              const { from, to } = data;
              console.log("start_conversation", data);
              const conversation = await startConversation({
                userId,
                from,
                to,
              });
              console.log("start_conversation ret", conversation);

              await emitToFromAndTo(
                io,
                {
                  id: to,
                  event: "start_chat",
                  payload: conversation,
                },
                {
                  id: from,
                  event: "start_chat",
                  payload: conversation,
                }
              );
            })
          );

          socket.on(
            "create_group_conversation",
            errorHandler(socket, async (data) => {
              console.log("create_group_conversation", data);
              const { name, members, adminId } = data;

              const { newGroupCvs } = await createGroup({
                name,
                members,
                adminId,
              });
              console.log("new group solveMsg", newGroupCvs);

              // join a room in socket and notice that a user Create room successfully
              const groupId = newGroupCvs.id.toString();
              socket.join(groupId);

              socket.emit("create_group_ret", {
                message: `Create room ${name} successfully`,
                newGroupCvs,
              });

              const admin = await User.findById(
                adminId,
                "_id firstName lastName"
              );
              // invite other member to join room
              await Promise.all(
                members.map(async (member) => {
                  const { socket_id } = await User.findById(
                    member.id,
                    "socket_id"
                  );
                  if (socket_id) {
                    io.to(socket_id).emit("join_group_request", {
                      message: `${admin.firstName} ${admin.lastName} invite you to join group ${name}`,
                      group: { id: groupId, name },
                      sender: admin,
                    });
                  }
                })
              );
            })
          );

          socket.on(
            "accept_join_group",
            errorHandler(socket, async (data) => {
              console.log("accept_join_group", data);
              const { groupId } = data;
              const res = await JoinGroupRequest.findOne({
                $and: [
                  { groupId },
                  { recipientId: userId },
                  { status: "requested" },
                ],
              }).lean();

              if (!res) {
                socket.emit("join_group_ret", {
                  status: "error",
                  message: `Group not found or you not invited to this group`,
                });
              } else {
                const updatedGroupCvs = await addMember({
                  userId,
                  requestId: res._id,
                  groupId,
                  newMemberId: userId,
                });
                console.log("updatedGroupCvs", updatedGroupCvs);

                // join a room in socket and notice that a user join room successfully
                socket.join(groupId);

                const newMember = await User.findById(
                  userId,
                  "_id firstName lastName"
                );
                io.in(groupId).emit("new_member", {
                  message: `Welcome new member to group ${updatedGroupCvs.name}, ${newMember.firstName} ${newMember.lastName}`,
                  updatedGroupCvs,
                  newMemberId: userId,
                });
              }
            })
          );

          // message
          socket.on(
            "text_message",
            errorHandler(socket, async (data) => {
              console.log("text_message", data);
              const { type: chatType, newMsg } = data;
              const { to, from, conversationId } = newMsg;
              console.log("userId at socket handler", userId);
              const res = await createTextMsg({ userId, chatType, newMsg });

              const payload = {
                conversationId,
                messages: [res],
                chatType: chatType,
              };
              // return all Socket instances of the main namespace
              // const sockets = await io.fetchSockets();
              // console.log("sockets", sockets);
              console.log("payload", payload);
              if (chatType === chatTypes.DIRECT_CHAT) {
                await emitToFromAndTo(
                  io,
                  {
                    id: to,
                    event: "new_messages",
                    payload,
                  },
                  {
                    id: from,
                    event: "new_messages",
                    payload,
                  }
                );
              } else {
                io.in(conversationId).emit("new_messages", payload);
              }
            })
          );

          socket.on(
            "delete_message",
            errorHandler(socket, async (data) => {
              const { msgId, type } = data;
              console.log("delete_message", data);
              // throw new Error("test");
              // TODO
              const msg = await msgDB[type].findById(msgId);
              if (msg.from.toString() === userId) {
                const delMsg = await deleteMsg({ msgId, type });

                const payload = { msgId, type };
                if (type === chatTypes.DIRECT_CHAT) {
                  await emitToFromAndTo(
                    io,
                    {
                      id: delMsg.to,
                      event: "delete_message_ret",
                      payload,
                    },
                    {
                      id: delMsg.from,
                      event: "delete_message_ret",
                      payload,
                    }
                  );
                } else {
                  io.in(delMsg.conversationId.toString()).emit(
                    "delete_message_ret",
                    payload
                  );
                }
              } else {
                socket.emit("delete_message_ret", {
                  status: "error",
                  message: "You don't not have permission to delete this msg",
                });
              }
            })
          );

          socket.on("disconnect", async (reason) => {
            console.log("connection close", userId);

            if (userId) {
              await User.findByIdAndUpdate(userId, {
                online: false,
              });
              // ISER IS OFFLINE BROAD CAST TO ALL CONNECTED USERS
              io.sockets.emit("offline", userId);
              // REMOVE OBJECT
              console.log("connection close userId", userId);
            }

            socket.disconnect(); // DISCONNECT SOCKET
          });
        } else {
          socket.emit("error", "user not found");
        }
      } catch (err) {
        socket.emit("error", "userId is not valid");
      }
    } else {
      socket.emit("error", "userId is required");
    }
  };
};
