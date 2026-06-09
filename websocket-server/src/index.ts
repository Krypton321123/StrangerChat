import {Server, Socket} from "socket.io"; 
import {randomUUID} from "crypto"

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
    messages: string[];
    looking: boolean; 
}

let users: User[] = [];
let waitingUsers: User[] = []; 
let rooms: Room[] = []; 

const io = new Server({
    cors: {
        origin: "*"
    }
}); 

const userConnected = (socket: Socket) => {
    users.push({socketId: socket.id ,userId: randomUUID(), active: false}); 

    io.emit("returncount", users.length); 
}

const usersInRoom = (roomId: string) => {
    const room = rooms.find(r => r.roomId === roomId)
    if (!room) return io.emit("count-room", 0); 
    io.to(roomId).emit("count-room", room.users.length); 
}


io.on("connection", socket => {
    
    userConnected(socket); 

    socket.on("find-partner", (nick: string) => {
        const user = users.find(u => u.socketId === socket.id); 
        user!.nick = nick; 

        users[users.findIndex(u => u.socketId === socket.id)] = user!; 

        console.log(users); 

        if (waitingUsers.length > 0) {
            const partner = waitingUsers.shift()!; 
            console.log(partner)
            const currentUser = users.find(u => u.socketId === socket.id)?.socketId;  
            console.log(currentUser)

            const room: Room = {roomId: randomUUID(), users: [partner?.socketId!, currentUser!], looking: false, messages: []}

            rooms.push(room); 

            socket.join(room.roomId); 
            io.sockets.sockets.get(partner?.socketId!)?.join(room.roomId)

            io.to(room.roomId).emit("match-found", room.roomId);
        } else {
            waitingUsers.push(users.find(u => u.socketId === socket.id)!); 
        }
    })

    socket.on("reach-room", (roomId: string) => {
        usersInRoom(roomId)
    })

    socket.on("leave-room", (roomId: string) => {
        const room = rooms.find(r => r.roomId === roomId); 

        if (!room?.users) return null;

        room.users = room?.users.filter(u => u !== socket.id); 

        rooms = rooms.filter(r => r.roomId === room.roomId); 
        
        rooms.push(room); 
        usersInRoom(room.roomId); 
    })

    socket.on("cancel-search", () => {
        waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);  
    })

    socket.on("disconnect", () => {
        const newUsers = users.filter(s => s.socketId !== socket.id); 
        users = [...newUsers];
        io.emit("returncount", users.length)
        console.log("User disconnected");
    })
});

io.listen(3002); 


