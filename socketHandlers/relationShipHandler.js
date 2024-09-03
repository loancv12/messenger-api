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
      const { recipientId, senderId } = data;

      const request = await makeFriendReq({ recipientId, senderId });

      io.to(recipientId).emit("new_friend_req", {
        message: "New Friend request received",
        newFriendReq: request,
      });

      io.to(senderId).emit("send_req_ret", {
        message: "Request sent successfully",
        newFriendReq: request,
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

      io.to(request.recipient.id.toString())
        .to(request.sender.id.toString())
        .emit("friend_req_accepted_ret", payload);
    })
  );

  //decline
  socket.on(
    "decline_friend_req",
    errorHandler(socket, async (data) => {
      console.log("decline_friend_req", data);
      const { requestId } = data;

      const request = await declineFriendReq({ requestId });
      console.log("friend_req_decline_ret", request);
      io.to(request.recipient.id.toString()).emit("friend_req_decline_ret", {
        message: "Decline friend request successful",
        request,
      });

      io.to(request.sender.id.toString()).emit("friend_req_decline_ret", {
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

      io.to(request.sender.id.toString()).emit("withdraw_friend_req_ret", {
        message: "Friend request withdraw successful",
        request,
      });

      io.to(request.recipient.id.toString()).emit("withdraw_friend_req_ret", {
        message: "Friend request was withdraw",
        request,
      });
    })
  );
};
