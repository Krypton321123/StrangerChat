'use client'
import {useParams} from "next/navigation"; 
import FloatingDock from "../_components/room/FloatingDock";
import Topbar from "../_components/room/Topbar";
import { useSocket } from "../_Providers/WebSocketProvider";
import { useEffect, useState } from "react";
import Chat from "../_components/room/Chat";

const Room = () => {
    const params = useParams(); 
    const socket = useSocket(); 
    const [userCount, setUserCount] = useState(0); 
    const [users, setUsers] = useState([]); 

    useEffect(() => {
        socket?.emit("reach-room", params.roomId); 

        socket?.on("count-room", (n) => {
            if (n === 0) alert("Room doesn't exist"); 
            setUsers(n)
            setUserCount(n.length); 
        })

        return () => {
            socket?.emit("leave-room", params.roomId)
        }
    }, [socket])

    return (
        <div className="w-full min-h-screen flex flex-col bg-[#0E0E0E]">
            <Topbar roomId={params.roomId?.toString()} socket={socket!} noOfUser={userCount}/>
            <div className="flex flex-1  ">
          
                <div className="flex flex-1">
                    placeholder for videos
                </div>
                <div className="">
                    <Chat users={users} socket={socket!} roomId={params.roomId?.toString()!} />
                </div>
            </div> 
        </div>
    )
}

export default Room;