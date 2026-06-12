"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const crypto_1 = require("crypto");
const wrtc_1 = __importDefault(require("@roamhq/wrtc"));
let users = [];
let waitingUsers = [];
let waitingRooms = [];
let rooms = [];
let receiverPcs = new Map();
let senderPcs = new Map();
let roomStreamReg = new Map();
const io = new socket_io_1.Server({
    cors: {
        origin: "*",
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    },
});
const userConnected = (socket) => {
    const user = { socketId: socket.id, userId: (0, crypto_1.randomUUID)(), active: false };
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
const createRecieverPeerConnection = (roomId, socket) => {
    try {
        const pc = new wrtc_1.default.RTCPeerConnection(pc_config);
        receiverPcs.set(socket.id, pc);
        pc.onicecandidate = (ev) => {
            socket.emit("getSenderCandidate", {
                candidate: ev.candidate,
            });
        };
        pc.ontrack = (ev) => {
            let roomStreams = roomStreamReg.get(roomId);
            if (!roomStreams) {
                roomStreams = new Map();
                roomStreamReg.set(roomId, roomStreams);
            }
            let stream = roomStreams.get(socket.id);
            if (!stream) {
                stream = new wrtc_1.default.MediaStream();
                roomStreams.set(socket.id, stream);
            }
            stream.addTrack(ev.track);
            if (stream.getTracks().length === 2) {
                socket.broadcast.to(roomId).emit("new-user-enter", socket.id);
            }
        };
        return pc;
    }
    catch (err) {
        console.log("create reciever error", err);
    }
};
// socket.id is the reciever
const createSenderPeerConnection = (roomId, socket, senderId) => {
    var _a;
    const pc = new wrtc_1.default.RTCPeerConnection(pc_config);
    try {
        // check if sender is already registered in the map
        if (senderPcs.has(senderId)) {
            const existingRecievers = senderPcs.get(senderId);
            const newRecievers = new Map([...existingRecievers, [socket.id, pc]]);
            senderPcs.set(senderId, newRecievers);
        }
        else {
            senderPcs.set(senderId, new Map([[socket.id, pc]]));
        }
        pc.onicecandidate = (ev) => {
            socket.emit("getRecieverCandidate", {
                id: senderId,
                candidate: ev.candidate,
            });
        };
        const userStream = (_a = roomStreamReg.get(roomId)) === null || _a === void 0 ? void 0 : _a.get(senderId);
        userStream === null || userStream === void 0 ? void 0 : userStream.getTracks().forEach((t) => pc.addTrack(t, userStream));
        return pc;
    }
    catch (err) {
        console.error("SENDER PEER CONN ERROR", err);
    }
};
const usersInRoom = (roomId, socket, leave) => {
    const room = rooms.find((r) => r.roomId === roomId);
    const roomIndex = rooms.findIndex((r) => r.roomId === roomId);
    if (!room)
        return io.emit("count-room", 0);
    if (!leave) {
        if (!room.users.includes(socket.id)) {
            room.users.push(socket.id);
            rooms[roomIndex] = room;
        }
        else
            ;
    }
    const usersToSend = room.users
        .map((u) => users.find((user) => u === user.socketId))
        .filter((a) => a !== undefined)
        .map((x) => {
        return { userId: x.userId, socketId: x.socketId, nick: x.nick || "" };
    });
    io.to(roomId).emit("count-room", usersToSend);
};
io.on("connection", (socket) => {
    userConnected(socket);
    socket.on("find-partner", (nick) => {
        var _a;
        const user = users.find((u) => u.socketId === socket.id);
        console.log(users);
        user.nick = nick;
        users[users.findIndex((u) => u.socketId === socket.id)] = user;
        console.log(users);
        if (waitingUsers.length > 0) {
            const partner = waitingUsers.shift();
            console.log(partner);
            const currentUser = users.find((u) => u.socketId === socket.id);
            if (!currentUser)
                return;
            console.log(currentUser);
            const room = {
                roomId: (0, crypto_1.randomUUID)(),
                users: [partner === null || partner === void 0 ? void 0 : partner.socketId, currentUser.socketId],
                looking: false,
                messages: [],
            };
            rooms.push(room);
            currentUser.Room = room;
            users[users.findIndex((u) => currentUser.socketId === u.socketId)] =
                currentUser;
            partner.Room = room;
            users[users.findIndex((u) => u.socketId === partner.socketId)] = partner;
            socket.join(room.roomId);
            (_a = io.sockets.sockets.get(partner === null || partner === void 0 ? void 0 : partner.socketId)) === null || _a === void 0 ? void 0 : _a.join(room.roomId);
            io.to(room.roomId).emit("match-found", room.roomId);
        }
        else {
            waitingUsers.push(users.find((u) => u.socketId === socket.id));
        }
    });
    socket.on("find-partner-room", (roomId) => {
        console.log("Reached here");
        const room = rooms.find(r => r.roomId === roomId);
        const roomIndex = rooms.findIndex(r => r.roomId === roomId);
        if (!room)
            return;
        if (waitingUsers.length > 0 || waitingRooms.length > 0) {
            console.log(waitingUsers);
            const user = waitingUsers.shift();
            room.users.push(user.socketId);
            rooms[roomIndex] = room;
            console.log(rooms, room.users);
            io.to(user.socketId).emit("match-found", roomId);
        }
        else {
            waitingRooms.push(room);
        }
    });
    socket.on("reach-room", (roomId) => {
        usersInRoom(roomId, socket);
    });
    socket.on("leave-room", (roomId) => {
        const room = rooms.find((r) => r.roomId === roomId);
        if (!(room === null || room === void 0 ? void 0 : room.users))
            return null;
        room.users = room === null || room === void 0 ? void 0 : room.users.filter((u) => u !== socket.id);
        const index = users.findIndex((u) => u.socketId === socket.id);
        users[index] = Object.assign(Object.assign({}, users[index]), { Room: undefined });
        rooms = rooms.filter((r) => r.roomId === room.roomId);
        rooms.push(room);
        usersInRoom(room.roomId, socket, true);
    });
    socket.on("cancel-search", () => {
        waitingUsers = waitingUsers.filter((u) => u.socketId !== socket.id);
    });
    socket.on("send-chat-message", (message) => {
        console.log(message.sentBy, users);
        console.log("came here");
        const user = users.find((u) => u.userId === message.sentBy);
        console.log("SEND MESSAGE USER:", user);
        message.nick = (user === null || user === void 0 ? void 0 : user.nick) || "";
        socket.to(user.Room.roomId).emit("message-recieved", message);
    });
    socket.on("start-typing", (roomId) => {
        console.log("came to start-typing");
        socket.to(roomId).emit("user-typing", socket.id);
    });
    socket.on("chat-offer", (offer, roomId, userId, peerId) => {
        const targetUser = users.find((u) => u.userId === peerId);
        if (!targetUser)
            return;
        socket.to(targetUser.socketId).emit("offer", offer, userId);
    });
    socket.on("chat-answer", (answer, roomId, userId, senderId) => {
        const targetUser = users.find((u) => u.userId === senderId);
        if (!targetUser)
            return;
        socket.to(targetUser.socketId).emit("answer", answer, userId);
    });
    socket.on("ice-candidate", (icecandidate, roomId, peerId, senderId) => {
        const targetUser = users.find((u) => u.userId === peerId);
        if (!targetUser)
            return;
        socket
            .to(targetUser.socketId)
            .emit("ice-candidate", icecandidate, senderId);
    });
    // the client is offering to send their stream
    socket.on("senderOffer", (roomId, sdp) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("SERVER: senderOffer from", socket.id);
        const pc = createRecieverPeerConnection(roomId, socket);
        yield (pc === null || pc === void 0 ? void 0 : pc.setRemoteDescription(sdp));
        let localSdp = yield (pc === null || pc === void 0 ? void 0 : pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        }));
        yield (pc === null || pc === void 0 ? void 0 : pc.setLocalDescription(localSdp));
        socket.emit("getSenderAnswer", { sdp: localSdp });
    }));
    // the client is sending their ice info
    socket.on("senderCandidate", (candidate) => __awaiter(void 0, void 0, void 0, function* () {
        let pc = receiverPcs.get(socket.id);
        if (!candidate)
            return;
        yield pc.addIceCandidate(new wrtc_1.default.RTCIceCandidate(candidate));
    }));
    socket.on("receiverOffer", (_a) => __awaiter(void 0, [_a], void 0, function* ({ roomId, sdp, senderId }) {
        const roomStreams = roomStreamReg.get(roomId);
        const pc = createSenderPeerConnection(roomId, socket, senderId);
        yield (pc === null || pc === void 0 ? void 0 : pc.setRemoteDescription(sdp));
        let localSdp = yield (pc === null || pc === void 0 ? void 0 : pc.createAnswer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        }));
        yield (pc === null || pc === void 0 ? void 0 : pc.setLocalDescription(localSdp));
        io.to(socket.id).emit("getReceiverAnswer", {
            id: senderId,
            sdp: localSdp,
        });
    }));
    // the server is sending ice info
    socket.on("receiverCandidate", (_a) => __awaiter(void 0, [_a], void 0, function* ({ id, candidate }) {
        var _b;
        let pc = (_b = senderPcs.get(id)) === null || _b === void 0 ? void 0 : _b.get(socket.id);
        yield (pc === null || pc === void 0 ? void 0 : pc.addIceCandidate(new wrtc_1.default.RTCIceCandidate(candidate)));
    }));
    socket.on("disconnect", () => {
        const newUsers = users.filter((s) => s.socketId !== socket.id);
        users = [...newUsers];
        io.emit("user-count", users.length);
        console.log("User disconnected");
    });
});
io.listen(3002, { cors: { origin: "*" } });
