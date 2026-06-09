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
    }
});
const userConnected = (socket) => {
    users.push({ socketId: socket.id, userId: (0, crypto_1.randomUUID)(), active: false });
    io.emit("returncount", users.length);
};
const usersInRoom = (roomId) => {
    const room = rooms.find(r => r.roomId === roomId);
    if (!room)
        return io.emit("count-room", 0);
    io.to(roomId).emit("count-room", room.users.length);
};
io.on("connection", socket => {
    userConnected(socket);
    socket.on("find-partner", (nick) => {
        var _a, _b;
        const user = users.find(u => u.socketId === socket.id);
        user.nick = nick;
        users[users.findIndex(u => u.socketId === socket.id)] = user;
        console.log(users);
        if (waitingUsers.length > 0) {
            const partner = waitingUsers.shift();
            console.log(partner);
            const currentUser = (_a = users.find(u => u.socketId === socket.id)) === null || _a === void 0 ? void 0 : _a.socketId;
            console.log(currentUser);
            const room = { roomId: (0, crypto_1.randomUUID)(), users: [partner === null || partner === void 0 ? void 0 : partner.socketId, currentUser], looking: false, messages: [] };
            rooms.push(room);
            socket.join(room.roomId);
            (_b = io.sockets.sockets.get(partner === null || partner === void 0 ? void 0 : partner.socketId)) === null || _b === void 0 ? void 0 : _b.join(room.roomId);
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
        rooms = rooms.filter(r => r.roomId === room.roomId);
        rooms.push(room);
        usersInRoom(room.roomId);
    });
    socket.on("cancel-search", () => {
        console.log("Waiting users", waitingUsers);
        waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);
        console.log("Waiting users after", waitingUsers);
    });
    socket.on("disconnect", () => {
        const newUsers = users.filter(s => s.socketId !== socket.id);
        users = [...newUsers];
        io.emit("returncount", users.length);
        console.log("User disconnected");
    });
});
io.listen(3002);
