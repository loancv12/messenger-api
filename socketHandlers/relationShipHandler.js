const {
  makeFriendReq,
  acceptFriendReq,
  declineFriendReq,
  withdrawFriendReq,
} = require("../controllers/user");
const { errorHandler } = require("../socket");

module.exports = (io, socket) => {
  const userId = socket.userId;

  // make friend req
  socket.on(
    "make_friend_request",
    errorHandler(socket, async (data, callback) => {
      console.log("make_friend_request", data);
      const { to, from } = data;

      const res = await makeFriendReq({ to, from });

      io.to(to).emit("new_friend_req", {
        message: "New Friend request received",
        newFriendRequest: res,
      });

      io.to(from).emit("send_req_ret", {
        message: "Request sent successfully",
        newFriendRequest: res,
      });
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
      io.to(request.recipientId)
        .to(request.senderId)
        .emit("friend_req_accepted_ret", payload);
    })
  );

  //decline
  socket.on(
    "decline_friend_req",
    errorHandler(socket, async (data) => {
      const { requestId } = data;

      const request = await declineFriendReq({ requestId });

      io.to(request.recipient.id).emit("friend_req_decline_ret", {
        message: "Decline friend request successful",
      });

      io.to(request.senderId).emit("friend_req_decline_ret", {
        message: `${request.recipient.firstName} ${request.recipient.lastName} declined your friend request`,
        request,
      });
    })
  );

  // withdraw
  socket.on(
    "withdraw_friend_req",
    errorHandler(socket, async (data) => {
      const { requestId } = data;

      const request = await withdrawFriendReq({ requestId });

      io.to(userId).emit("withdraw_friend_req_ret", {
        message: "Friend request withdraw successful",
      });
    })
  );
};
