'use client'
import {useParams} from "next/navigation"; 
import FloatingDock from "../_components/room/FloatingDock";
import Topbar from "../_components/room/Topbar";
import { useSocket } from "../_Providers/WebSocketProvider";
import { useEffect, useState } from "react";

const Room = () => {
    const params = useParams(); 
    const socket = useSocket(); 
    const [userCount, setUserCount] = useState(0); 

    useEffect(() => {
        socket?.emit("reach-room", params.roomId); 

        socket?.on("count-room", (n) => {
            if (n === 0) alert("Room doesn't exist"); 
            setUserCount(n)
        })
    }, [socket])

    return (
        <div className="w-full h-screen bg-[#0E0E0E]">
            <Topbar roomId={params.roomId?.toString()} socket={socket!} noOfUser={userCount}/>
            <div className="max-w-7xl mx-auto">
                <div className="w-full flex justify-center">
                    <FloatingDock />
                </div>
            </div> 
        </div>
    )
}

export default Room;