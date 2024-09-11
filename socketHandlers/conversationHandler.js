const {
  startConversation,
  createGroup,
  addMember,
} = require("../controllers/conversation");
const JoinGroupRequest = require("../models/JoinGroupRequest");
const User = require("../models/User");
const { errorHandler } = require("../socket");

module.exports = (io, socket) => {
  const userId = socket.userId;

  // start cvs, only direct cvs
  socket.on(
    "start_conversation",
    errorHandler(socket, async (data) => {
      const { from, to } = data;
      const conversation = await startConversation({
        userId,
        from,
        to,
      });
      console.log("start_conversation ret", { conversation });

      io.to(to).to(from).emit("start_chat", { conversation });
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

      io.to(adminId).emit("create_group_ret", {
        message: `Create room ${name} successfully`,
        newGroupCvs,
      });

      const admin = await User.findById(
        adminId,
        "firstName lastName avatar online"
      );
      // invite other member to join room
      io.to(members.map((member) => member.id)).emit("join_group_request", {
        message: `${admin.firstName} ${admin.lastName} invite you to join group ${name}`,
        group: { id: groupId, name },
        sender: admin,
      });
    })
  );

  socket.on(
    "make_all_socket_of_admin_join_group",
    errorHandler(socket, async (data) => {
      console.log("make_all_socket_of_admin_join_group", data);
      const { message, newGroupCvs } = data;

      socket.join(newGroupCvs.id);
    })
  );

  socket.on(
    "accept_join_group",
    errorHandler(socket, async (data) => {
      console.log("accept_join_group", data);
      const { groupId } = data;
      const res = await JoinGroupRequest.findOne({
        $and: [{ groupId }, { recipientId: userId }, { status: "requested" }],
      }).lean();

      if (!res) {
        io.to(userId).emit("join_group_ret", {
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

        const newMember = await User.findById(userId, "firstName lastName");

        // use io instead of socket to make sure that new user also receive event
        io.in(groupId).emit("new_member", {
          message: `Welcome new member to group ${updatedGroupCvs.name}, ${newMember.firstName} ${newMember.lastName}`,
          updatedGroupCvs,
          newMemberId: userId,
        });
      }
    })
  );

  socket.on("make_invite_call", (data) => {
    const { roomId, senderId, otherUserIdsInCvs } = data;
    console.log("call_invite", data);
    io.to(otherUserIdsInCvs).emit("call_invite", { roomId, senderId });
  });

  socket.on("decline_invite", (data) => {
    const { roomId, senderId, receiverId } = data;
    console.log("decline_invite", roomId, senderId, receiverId);
    io.to(senderId).emit("decline_invite", data);
  });
};
