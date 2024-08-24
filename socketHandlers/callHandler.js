// const { errorHandler } = require("../socket");

// const socketIdsARoom = {};
// // const socketToRoom = {};

// const users = {};

// const socketToRoom = {};

// module.exports = (io, socket) => {
//   const userId = socket.userId;
//   const nsp = socket.nsp;
//   let currRoomId;
//   const socketId = socket.id;
//   console.log("socket.id", socketId);
//   console.log(socketIdsARoom, socketToRoom);

//   socket.on(
//     "join_room",
//     errorHandler(socket, async (data) => {
//       const { roomId } = data;
//       console.log("join_room", data);

//       currRoomId = roomId;

//       if (socketIdsARoom[roomId]) {
//         const length = socketIdsARoom[roomId].length;
//         if (length === 4) {
//           socket.emit("room full");
//           return;
//         }
//         socketIdsARoom[roomId].push(socket.id);
//       } else {
//         socketIdsARoom[roomId] = [socket.id];
//       }

//       socketToRoom[socket.id] = roomId;
//       const otherSocketIdsInThisRoom = socketIdsARoom[roomId].filter(
//         (id) => id !== socket.id
//       );

//       socket.emit(
//         "make_peer_to_other_socket",
//         otherSocketIdsInThisRoom,
//         socketId
//       );
//     })
//   );

//   socket.on("send_signal_to_other", (data) => {
//     const { socketIdOfReceiver, socketIdOfSender, signal } = data;
//     console.log(
//       "send_signal_to_other",
//       socketIdOfReceiver,
//       socketIdOfSender,
//       signal.type
//     );
//     socket.to(socketIdOfReceiver).emit("receive_signal", {
//       signal,
//       socketIdOfSender,
//     });
//   });

//   // sender send signal to receiver
//   socket.on("sending_signal_to_receiver", (data) => {
//     const { socketIdOfReceiver, socketIdOfSender, signal } = data;
//     console.log("sending_signal_to_receiver", data);
//     socket.to(socketIdOfReceiver).emit("signal_of_sender", {
//       signal,
//       socketIdOfSender,
//     });
//   });

//   // client of receiver emit this event
//   socket.on("ask_sender_say_hi", (data) => {
//     const { signal, socketIdOfSender } = data;
//     console.log("ask_sender_say_hi", data);

//     socket.to(socketIdOfSender).emit("signal_of_receiver", {
//       signal,
//       socketIdOfReceiver: socket.id,
//     });
//   });

//   // TODO: CREATE A OTHER NAMESPACE FOR CALL, cause user may not emit this event when accidentaly close tab
//   // use beforeunload is not reliably fired, especially on mobile platforms
//   socket.on(
//     "disconnect",
//     errorHandler(socket, async (data) => {
//       const socketIds = socketIdsARoom[currRoomId];
//       console.log("socketIds", socketIds);

//       const otherSocketIdsInRoom = socketIds?.filter(
//         (socketId) => socketId !== socket.id
//       );

//       socketIdsARoom[currRoomId] = otherSocketIdsInRoom;

//       socket.to(otherSocketIdsInRoom).emit("user_left", socket.id);
//     })
//   );

//   socket.on("join room", (roomID) => {
//     console.log("join room", roomID);

//     if (users[roomID]) {
//       const length = users[roomID].length;
//       if (length === 4) {
//         socket.emit("room full");
//         return;
//       }
//       users[roomID].push(socket.id);
//     } else {
//       users[roomID] = [socket.id];
//     }
//     socketToRoom[socket.id] = roomID;
//     const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

//     socket.emit("all users", usersInThisRoom, socket.id);
//   });

//   socket.on("sending signal", (payload) => {
//     console.log("sending signal", payload);

//     io.to(payload.userToSignal).emit("user joined", {
//       signal: payload.signal,
//       callerID: payload.callerID,
//     });
//   });

//   socket.on("returning signal", (payload) => {
//     console.log("returning signal", payload);

//     io.to(payload.callerID).emit("receiving returned signal", {
//       signal: payload.signal,
//       id: socket.id,
//     });
//   });

//   // socket.on("disconnect", () => {
//   //   const roomID = socketToRoom[socket.id];
//   //   let room = users[roomID];
//   //   if (room) {
//   //     room = room.filter((id) => id !== socket.id);
//   //     users[roomID] = room;
//   //   }
//   // });
// };

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

  socket.on("send_signal_to_other", (data) => {
    const { userIdOfSender, userIdOfReceiver, signal } = data;
    console.log("send_signal_to_other", userIdOfSender, signal.type);
    socket.to(userIdOfReceiver).emit("signal_of_other", {
      signal,
      userIdOfSender,
    });
  });

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

  // sender send signal to receiver
  socket.on("sending_signal_to_receiver", (data) => {
    const { socketIdOfReceiver, socketIdOfSender, signal } = data;
    console.log("sending_signal_to_receiver", data);
    socket.to(socketIdOfReceiver).emit("signal_of_sender", {
      signal,
      socketIdOfSender,
    });
  });

  // client of receiver emit this event
  socket.on("ask_sender_say_hi", (data) => {
    const { signal, socketIdOfSender } = data;
    console.log("ask_sender_say_hi", data);

    socket.to(socketIdOfSender).emit("signal_of_receiver", {
      signal,
      socketIdOfReceiver: socket.id,
    });
  });

  socket.on("leave_room", (data) => {
    const { roomId, userId } = data;
    const userObjs = userIdsARoom[roomId];
    console.log("leave_room userObjs", userObjs);

    const otherUserObjsInRoom = userObjs?.filter(
      (userObj) => userObj.userId !== userId
    );

    socket.leave(userId);

    userIdsARoom[currRoomId] = otherUserObjsInRoom;
    console.log("leave_room", data);
  });

  // TODO: CREATE A OTHER NAMESPACE FOR CALL, cause user may not emit this event when accidentaly close tab
  // use beforeunload is not reliably fired, especially on mobile platforms
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
      }
      socket.leave(userId);
      currRoomId = null;
      socket.to(otherUserObjsInRoom).emit("user_left", socket.id);
    })
  );
};
