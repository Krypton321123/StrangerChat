import {Server, Socket} from "socket.io"; 
import {randomUUID} from "crypto"

interface User {
    userId: string; 
    active: boolean;
    socketId: string;
    Room?: Room; 
}

interface Room {
    roomId: string; 
    users: string[]; 
    messages: string[];
    looking: boolean; 
}

let users: User[] = [];
let waitingUsers: User[] = []; 
const rooms = []; 

const io = new Server({
    cors: {
        origin: "*"
    }
}); 

const userConnected = (socket: Socket) => {
    users.push({socketId: socket.id ,userId: randomUUID(), active: false}); 

    io.emit("returncount", users.length); 
}



io.on("connection", socket => {
    
    userConnected(socket); 

    socket.on("find-partner", () => {
        console.log("came here")
        if (waitingUsers.length > 0) {
            const partner = waitingUsers.shift()!; 
            console.log(partner)
            const currentUser = users.find(u => u.socketId === socket.id)?.socketId;  
            console.log(currentUser)

            const room: Room = {roomId: randomUUID(), users: [partner?.socketId!, currentUser!], looking: false, messages: []}
            console.log(room)

            socket.join(room.roomId); 
            io.sockets.sockets.get(partner?.socketId!)?.join(room.roomId)

            io.to(room.roomId).emit("match-found", room.roomId);
        } else {
            waitingUsers.push(users.find(u => u.socketId === socket.id)!); 
        }
    })

    socket.on("disconnect", () => {
        const newUsers = users.filter(s => s.socketId !== socket.id); 
        users = [...newUsers];
        io.emit("returncount", users.length)
        console.log("User disconnected");
    })
});

io.listen(3002); 


