"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const crypto_1 = require("crypto");
let users = [];
let waitingUsers = [];
let rooms = [];
const io = new socket_io_1.Server({
    cors: {
        origin: "*"
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
    }
});
const userConnected = (socket) => {
    const user = { socketId: socket.id, userId: (0, crypto_1.randomUUID)(), active: false };
    users.push(user);
    console.log(user.userId);
    socket.emit("init-user", user);
    io.emit("user-count", users.length);
};
const usersInRoom = (roomId) => {
    const room = rooms.find(r => r.roomId === roomId);
    if (!room)
        return io.emit("count-room", 0);
    const usersToSend = room.users.map(u => users.find(user => u === user.socketId)).filter(a => a !== undefined).map(x => { return { userId: x.userId, socketId: x.socketId, nick: x.nick || "" }; });
    io.to(roomId).emit("count-room", usersToSend);
};
io.on("connection", socket => {
    userConnected(socket);
    socket.on("find-partner", (nick) => {
        var _a;
        const user = users.find(u => u.socketId === socket.id);
        user.nick = nick;
        users[users.findIndex(u => u.socketId === socket.id)] = user;
        console.log(users);
        if (waitingUsers.length > 0) {
            const partner = waitingUsers.shift();
            console.log(partner);
            const currentUser = users.find(u => u.socketId === socket.id);
            if (!currentUser)
                return;
            console.log(currentUser);
            const room = { roomId: (0, crypto_1.randomUUID)(), users: [partner === null || partner === void 0 ? void 0 : partner.socketId, currentUser.socketId], looking: false, messages: [] };
            rooms.push(room);
            currentUser.Room = room;
            users[users.findIndex(u => currentUser.socketId === socket.id)] = currentUser;
            partner.Room = room;
            users[users.findIndex(u => u.socketId === partner.socketId)] = partner;
            socket.join(room.roomId);
            (_a = io.sockets.sockets.get(partner === null || partner === void 0 ? void 0 : partner.socketId)) === null || _a === void 0 ? void 0 : _a.join(room.roomId);
            io.to(room.roomId).emit("match-found", room.roomId);
        }
        else {
            waitingUsers.push(users.find(u => u.socketId === socket.id));
        }
    });
    socket.on("reach-room", (roomId) => {
        usersInRoom(roomId);
    });
    socket.on("leave-room", (roomId) => {
        const room = rooms.find(r => r.roomId === roomId);
        if (!(room === null || room === void 0 ? void 0 : room.users))
            return null;
        room.users = room === null || room === void 0 ? void 0 : room.users.filter(u => u !== socket.id);
        const index = users.findIndex(u => u.socketId === socket.id);
        users[index] = Object.assign(Object.assign({}, users[index]), { Room: undefined });
        rooms = rooms.filter(r => r.roomId === room.roomId);
        rooms.push(room);
        usersInRoom(room.roomId);
    });
    socket.on("cancel-search", () => {
        waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);
    });
    socket.on("send-chat-message", (message) => {
        console.log(message.sentBy, users);
        console.log("came here");
        const user = users.find(u => u.userId === message.sentBy);
        console.log("SEND MESSAGE USER:", user);
        message.nick = (user === null || user === void 0 ? void 0 : user.nick) || "";
        socket.to(user.Room.roomId).emit("message-recieved", message);
    });
    socket.on("start-typing", (roomId) => {
        console.log("came to start-typing");
        socket.to(roomId).emit("user-typing", socket.id);
    });
    socket.on("disconnect", () => {
        const newUsers = users.filter(s => s.socketId !== socket.id);
        users = [...newUsers];
        io.emit("user-count", users.length);
        console.log("User disconnected");
    });
});
io.listen(3002);
