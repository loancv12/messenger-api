const { errorHandler } = require("../socket");

const userIdsARoom = {};
const userToRoom = {};

module.exports = (io, socket) => {
  const userId = socket.userId;
  const nsp = socket.nsp;
  let currRoomId;
  const socketId = socket.id;
  console.log("socket.id", socketId);
  console.log(userIdsARoom, userToRoom);
  socket.join(userId);

  socket.on(
    "join_room",
    errorHandler(socket, async (data) => {
      const { roomId } = data;
      console.log("join_room", data, userIdsARoom, userToRoom);
      // socket.join(roomId);

      currRoomId = roomId;

      // all userId attach with socketId in a specified room
      let userObjs = userIdsARoom[roomId];

      // someone created this room before
      if (userObjs) {
        const length = userObjs.length;
        if (length === 4) {
          socket.emit("room full");
          return;
        }
        // this userId used to join this room but someHow not be remove, now change socketId of it
        const foundUserObj = userIdsARoom[roomId].find(
          (userObj) => userObj.userId === userId
        );
        if (foundUserObj) {
          foundUserObj.socketId = socket.id;
        } else {
          // this user never join this room
          userIdsARoom[roomId].push({ userId, socketId: socket.id });
        }
      } else {
        // room havent created
        userIdsARoom[roomId] = [{ userId, socketId: socket.id }];
      }

      userToRoom[userId] = roomId;

      const otherUserIdsInRoom = userIdsARoom[roomId].filter(
        (userObj) => userObj.userId !== userId
      );

      socket.emit("make_peer_to_other_user", otherUserIdsInRoom, socketId);
    })
  );

  socket.on("send_signal_to_join_before", (data) => {
    const { userIdJoinBefore, userIdJoinLater, signal } = data;
    console.log(
      "send_signal_to_join_before",
      userIdJoinBefore,
      userIdJoinLater,
      signal.type
    );

    socket.to(userIdJoinBefore).emit("signal_of_join_later", {
      signal,
      userIdJoinLater,
    });
  });

  socket.on("send_signal_to_join_later", (data) => {
    const { userIdJoinBefore, userIdJoinLater, signal } = data;
    console.log("send_signal_to_join_later", userIdJoinLater, signal.type);

    socket.to(userIdJoinLater).emit("signal_of_join_before", {
      signal,
      userIdJoinBefore,
    });
  });

  socket.on("leave_room", (data) => {
    const { roomId, userId: userLeave, otherUserIdsInCvs } = data;
    const userObjs = userIdsARoom[roomId];
    console.log("leave_room userObjs", userObjs);

    const otherUserObjsInRoom = userObjs?.filter(
      (userObj) => userObj.userId !== userId
    );
    socket
      .to(otherUserIdsInCvs)
      .emit("a_user_leave_room", { userId: userLeave, roomId });
    socket.leave(userId);
    userIdsARoom[currRoomId] = otherUserObjsInRoom;
    userToRoom[currRoomId] = null;
    console.log("leave_room", data);
  });

  socket.on(
    "disconnect",
    errorHandler(socket, async (data) => {
      if (currRoomId) {
        const userObjs = userIdsARoom[currRoomId];
        console.log("userObjs", userObjs);

        const otherUserObjsInRoom = userObjs?.filter(
          (userObj) => userObj.userId !== userId
        );

        userIdsARoom[currRoomId] = otherUserObjsInRoom;
        socket.to(otherUserObjsInRoom).emit("a_user_leave_room", socket.id);
      }
      socket.leave(userId);
      currRoomId = null;
    })
  );
};
