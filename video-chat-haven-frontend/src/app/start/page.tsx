"use client"
import Target from "../_components/start/Target"; 
import Topbar from "../_components/landing/Topbar"
import CancelBtn from "../_components/start/CancelBtn"; 
import { useSocket } from "../_Providers/WebSocketProvider";
import { useEffect } from "react";
import {useRouter} from "next/navigation"

const Start = () => {
            
    const router = useRouter(); 

    const socket = useSocket(); 

    useEffect(() => {
        socket?.emit("find-partner"); 

        socket?.on("match-found", (r: string) => {
           router.push(`/${r}`) 
        })
    }, [socket])

    return (
        <div className="w-full h-screen bg-[#0E0E0E]">
            <Topbar />

            <div className="max-w-7xl h-full mx-auto flex flex-col items-center ">
                <Target />

                <div className="text-white gap-y-4 flex flex-col">
                    <p className="text-4xl font-bold tracking-wide">Finding Someone for You</p>
                    <p className="text-center text-lg animate-pulse text-[#6366f1] font-mono">Connection Pending...</p>
                </div>

                <CancelBtn />
            </div>
        </div> 
    )
}

export default Start; 
