import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";
import wrtc from "@roamhq/wrtc";

interface User {
  userId: string;
  active: boolean;
  socketId: string;
  Room?: Room;
  nick?: string;
}

interface Room {
  roomId: string;
  users: string[];
  messages: Message[];
  looking: boolean;
}

interface Message {
  messageId: string;
  content: string;
  sentBy: string;
  nick?: string;
}

let users: User[] = [];
let waitingUsers: User[] = [];
let waitingRooms: Room[] = []
let rooms: Room[] = [];
let receiverPcs: Map<string, wrtc.RTCPeerConnection> = new Map();
let senderPcs: Map<string, Map<string, RTCPeerConnection>> = new Map();
let roomStreamReg: Map<string, Map<string, MediaStream>> = new Map();
let streamReadyUsers: Map<string, Set<string>> = new Map() // room -> socketid mapping

const io = new Server({
  cors: {
    origin: "*",
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

const userConnected = (socket: Socket) => {
  const user = { socketId: socket.id, userId: randomUUID(), active: false };
  users.push(user);
  console.log(user.userId, user.socketId);

  socket.emit("init-user", user);
  io.emit("user-count", users.length);
};

const pc_config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// the socket is sending their stream down
const createRecieverPeerConnection = (roomId: string, socket: Socket) => {
  try {
    const pc = new wrtc.RTCPeerConnection(pc_config);

    receiverPcs.set(socket.id, pc);

    pc.onicecandidate = (ev: wrtc.RTCPeerConnectionIceEvent) => {
      socket.emit("getSenderCandidate", {
        candidate: ev.candidate,
      });
    };

    pc.ontrack = (ev: RTCTrackEvent) => {

      let roomStreams = roomStreamReg.get(roomId);
      if (!roomStreams) {
        roomStreams = new Map();
        roomStreamReg.set(roomId, roomStreams);
      }

      let stream = roomStreams.get(socket.id);
      if (!stream) {
        stream = new wrtc.MediaStream();
        roomStreams.set(socket.id, stream);
      }

      stream.addTrack(ev.track);

     

      if (stream.getTracks().length === 2) {
        if (!streamReadyUsers.has(roomId)) {
          streamReadyUsers.set(roomId, new Set()); 
        }

        streamReadyUsers.get(roomId)?.add(socket.id); 
        socket.broadcast.to(roomId).emit("new-user-enter", socket.id);
      }
    };

    return pc;
  } catch (err) {
    console.log("create reciever error", err);
  }
};

// socket.id is the reciever
const createSenderPeerConnection = (
  roomId: string,
  socket: Socket,
  senderId: string,
) => {
  const pc = new wrtc.RTCPeerConnection(pc_config);

  try {
    // check if sender is already registered in the map
    if (senderPcs.has(senderId)) {
      const existingRecievers = senderPcs.get(senderId);
      const newRecievers = new Map([...existingRecievers!, [socket.id, pc]]);

      senderPcs.set(senderId, newRecievers);
    } else {
      senderPcs.set(senderId, new Map([[socket.id, pc]]));
    }

    pc.onicecandidate = (ev: wrtc.RTCPeerConnectionIceEvent) => {
      socket.emit("getRecieverCandidate", {
        id: senderId,
        candidate: ev.candidate,
      });
    };

    const userStream = roomStreamReg.get(roomId)?.get(senderId);
    userStream?.getTracks().forEach((t) => pc.addTrack(t, userStream));

    return pc;
  } catch (err) {
    console.error("SENDER PEER CONN ERROR", err);
  }
};

const usersInRoom = (roomId: string, socket: Socket, leave?: boolean) => {
  const room = rooms.find((r) => r.roomId === roomId);
  const roomIndex = rooms.findIndex((r) => r.roomId === roomId);
  if (!room) return io.emit("count-room", 0);
  if (!leave) {
    if (!room.users.includes(socket.id)) {
      console.log("came here in add user")
      room.users.push(socket.id);
      rooms[roomIndex] = room;
    } else;
  }
  const usersToSend: Pick<User, "userId" | "socketId" | "nick">[] = room.users
    .map((u) => users.find((user) => u === user.socketId))
    .filter((a) => a !== undefined)
    .map((x) => {
      return { userId: x.userId, socketId: x.socketId, nick: x.nick || "" };
    });
    console.log("userstosend", usersToSend)
  io.to(roomId).emit("count-room", usersToSend);
};

io.on("connection", (socket) => {
  userConnected(socket);

  socket.on("find-partner", (nick: string) => {
    const user = users.find((u) => u.socketId === socket.id);
    console.log(users); 
    user!.nick = nick;

    users[users.findIndex((u) => u.socketId === socket.id)] = user!;

    console.log(users);

    if (waitingUsers.length > 0) {
      const partner = waitingUsers.shift()!;
      console.log(partner);
      const currentUser: User | undefined = users.find(
        (u) => u.socketId === socket.id,
      );

      if (!currentUser) return;
      console.log(currentUser);

      const room: Room = {
        roomId: randomUUID(),
        users: [partner?.socketId!, currentUser!.socketId],
        looking: false,
        messages: [],
      };

      rooms.push(room);
      currentUser!.Room = room;
      users[users.findIndex((u) => currentUser.socketId === u.socketId)] =
        currentUser;

      partner!.Room = room;
      users[users.findIndex((u) => u.socketId === partner.socketId)] = partner;

      socket.join(room.roomId);
      io.sockets.sockets.get(partner?.socketId!)?.join(room.roomId);

      io.to(room.roomId).emit("match-found", room.roomId);
    } else {
      waitingUsers.push(users.find((u) => u.socketId === socket.id)!);
    }
  });

  socket.on("find-partner-room", (roomId) => {
    console.log("Reached here"); 
    const room = rooms.find(r => r.roomId === roomId); 
    const roomIndex = rooms.findIndex(r => r.roomId === roomId); 
    if (!room) return; 

    if (waitingUsers.length > 0 || waitingRooms.length > 0) {

      console.log(waitingUsers);

      const user = waitingUsers.shift()!; 

      room.users.push(user.socketId); 

      rooms[roomIndex] = room; 
      console.log(rooms, room.users); 

      io.to(user.socketId).emit("match-found", roomId)
    } else {
      waitingRooms.push(room); 
    }
  })

  socket.on("reach-room", (roomId: string) => {
    socket.join(roomId);
    usersInRoom(roomId, socket);

    const readyInRoom = streamReadyUsers.get(roomId); 
    console.log("readyinroom", readyInRoom);
    const readyUsers = readyInRoom ? Array.from(readyInRoom).filter(u => socket.id !== u) : []
    socket.emit("existing-streams-ready", readyUsers);
  });

  socket.on("leave-room", (roomId: string) => {
    const room = rooms.find((r) => r.roomId === roomId);

    if (!room?.users) return null;

    room.users = room?.users.filter((u) => u !== socket.id);

    const index = users.findIndex((u) => u.socketId === socket.id);
    users[index] = { ...users[index], Room: undefined };

    rooms = rooms.filter((r) => r.roomId === room.roomId);

    rooms.push(room);
    usersInRoom(room.roomId, socket, true);
    streamReadyUsers.get(roomId)?.delete(socket.id)
  });

  socket.on("cancel-search", () => {
    waitingUsers = waitingUsers.filter((u) => u.socketId !== socket.id);
  });

  socket.on("send-chat-message", (message: Message) => {
    console.log(message.sentBy, users);
    console.log("came here");
    const user = users.find((u) => u.userId === message.sentBy);
    console.log("SEND MESSAGE USER:", user);
    message.nick = user?.nick || "";
    socket.to(user!.Room!.roomId).emit("message-recieved", message);
  });

  socket.on("start-typing", (roomId: string) => {
    console.log("came to start-typing");
    socket.to(roomId).emit("user-typing", socket.id);
  });

  socket.on(
    "chat-offer",
    (offer, roomId: string, userId: string, peerId: string) => {
      const targetUser = users.find((u) => u.userId === peerId);
      if (!targetUser) return;
      socket.to(targetUser.socketId).emit("offer", offer, userId);
    },
  );
  socket.on(
    "chat-answer",
    (answer, roomId: string, userId: string, senderId: string) => {
      const targetUser = users.find((u) => u.userId === senderId);
      if (!targetUser) return;
      socket.to(targetUser.socketId).emit("answer", answer, userId);
    },
  );

  socket.on(
    "ice-candidate",
    (icecandidate, roomId: string, peerId: string, senderId: string) => {
      const targetUser = users.find((u) => u.userId === peerId);
      if (!targetUser) return;
      socket
        .to(targetUser.socketId)
        .emit("ice-candidate", icecandidate, senderId);
    },
  );

  // the client is offering to send their stream
  socket.on("senderOffer", async (roomId, sdp) => {
    console.log("SERVER: senderOffer from", socket.id);

    const pc = createRecieverPeerConnection(roomId, socket);

    await pc?.setRemoteDescription(sdp);
    let localSdp = await pc?.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc?.setLocalDescription(localSdp);
    socket.emit("getSenderAnswer", { sdp: localSdp });
  });

  // the client is sending their ice info
  socket.on("senderCandidate", async (candidate) => {
    let pc = receiverPcs.get(socket.id)!;
    if (!candidate) return;

    await pc.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
  });

  socket.on("receiverOffer", async ({ roomId, sdp, senderId }) => {

  const roomStreams = roomStreamReg.get(roomId);

    const pc = createSenderPeerConnection(roomId, socket, senderId);

    await pc?.setRemoteDescription(sdp);
    let localSdp = await pc?.createAnswer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await pc?.setLocalDescription(localSdp);
    io.to(socket.id).emit("getReceiverAnswer", {
      id: senderId,
      sdp: localSdp,
    });
  });

  // the server is sending ice info
  socket.on("receiverCandidate", async ({ id, candidate }) => {
    let pc = senderPcs.get(id)?.get(socket.id);

    await pc?.addIceCandidate(new wrtc.RTCIceCandidate(candidate));
  });

  socket.on("disconnect", () => {
    const newUsers = users.filter((s) => s.socketId !== socket.id);
    users = [...newUsers];
    io.emit("user-count", users.length);
    streamReadyUsers.forEach(set => set.delete(socket.id)); 
    console.log("User disconnected");
  });
});

io.listen(3002, { cors: { origin: "*" } });
