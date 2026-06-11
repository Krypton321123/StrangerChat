import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";

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
let rooms: Room[] = [];
let receiverPcs = []; 
let senderPcs = []; 

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
  console.log(user.userId);

  socket.emit("init-user", user);
  io.emit("user-count", users.length);
};

const usersInRoom = (roomId: string) => {
  const room = rooms.find((r) => r.roomId === roomId);
  if (!room) return io.emit("count-room", 0);
  const usersToSend: Pick<User, "userId" | "socketId" | "nick">[] = room.users
    .map((u) => users.find((user) => u === user.socketId))
    .filter((a) => a !== undefined)
    .map((x) => {
      return { userId: x.userId, socketId: x.socketId, nick: x.nick || "" };
    });
  io.to(roomId).emit("count-room", usersToSend);
};

io.on("connection", (socket) => {
  userConnected(socket);

  socket.on("find-partner", (nick: string) => {
    const user = users.find((u) => u.socketId === socket.id);
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
      users[users.findIndex((u) => currentUser.socketId === socket.id)] =
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

  socket.on("reach-room", (roomId: string) => {
    usersInRoom(roomId);
  });

  socket.on("leave-room", (roomId: string) => {
    const room = rooms.find((r) => r.roomId === roomId);

    if (!room?.users) return null;

    room.users = room?.users.filter((u) => u !== socket.id);

    const index = users.findIndex((u) => u.socketId === socket.id);
    users[index] = { ...users[index], Room: undefined };

    rooms = rooms.filter((r) => r.roomId === room.roomId);

    rooms.push(room);
    usersInRoom(room.roomId);
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

socket.on("chat-offer", (offer, roomId: string, userId: string, peerId: string) => {
    const targetUser = users.find(u => u.userId === peerId);
    if (!targetUser) return;
    socket.to(targetUser.socketId).emit("offer", offer, userId);
});
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

  socket.on("disconnect", () => {
    const newUsers = users.filter((s) => s.socketId !== socket.id);
    users = [...newUsers];
    io.emit("user-count", users.length);
    console.log("User disconnected");
  });
});

io.listen(3002, { cors: { origin: "*" } });
