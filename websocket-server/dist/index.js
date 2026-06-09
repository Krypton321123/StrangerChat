"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const crypto_1 = require("crypto");
let users = [];
let waitingUsers = [];
const rooms = [];
const io = new socket_io_1.Server({
    cors: {
        origin: "*"
    }
});
const userConnected = (socket) => {
    users.push({ socketId: socket.id, userId: (0, crypto_1.randomUUID)(), active: false });
    io.emit("returncount", users.length);
};
io.on("connection", socket => {
    userConnected(socket);
    socket.on("find-partner", () => {
        var _a, _b;
        console.log("came here");
        if (waitingUsers.length > 0) {
            const partner = waitingUsers.shift();
            console.log(partner);
            const currentUser = (_a = users.find(u => u.socketId === socket.id)) === null || _a === void 0 ? void 0 : _a.socketId;
            console.log(currentUser);
            const room = { roomId: (0, crypto_1.randomUUID)(), users: [partner === null || partner === void 0 ? void 0 : partner.socketId, currentUser], looking: false, messages: [] };
            console.log(room);
            socket.join(room.roomId);
            (_b = io.sockets.sockets.get(partner === null || partner === void 0 ? void 0 : partner.socketId)) === null || _b === void 0 ? void 0 : _b.join(room.roomId);
            io.to(room.roomId).emit("match-found", room.roomId);
        }
        else {
            waitingUsers.push(users.find(u => u.socketId === socket.id));
        }
    });
    socket.on("disconnect", () => {
        const newUsers = users.filter(s => s.socketId !== socket.id);
        users = [...newUsers];
        io.emit("returncount", users.length);
        console.log("User disconnected");
    });
});
io.listen(3002);
