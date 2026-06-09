"use client"
import Target from "../_components/start/Target"; 
import Topbar from "../_components/landing/Topbar"
import CancelBtn from "../_components/start/CancelBtn"; 
import { useSocket } from "../_Providers/WebSocketProvider";
import { useEffect, useRef, useState } from "react";
import {useRouter} from "next/navigation"
import { useUserStore } from "@/store/userStore";

const Start = () => {
            
    const router = useRouter(); 
    const [nameModal, setNameModal] = useState(true); 
    const [nick, setNick] = useState(""); 
    const setNickStore = useUserStore(state => state.setNick); 

    const onDone = () => {
        setNickStore(nick); 
    }

    const socket = useSocket(); 
    const cancelBtnRef = useRef(false); 

    useEffect(() => {
        if (!nameModal) socket?.emit("find-partner", nick); 

        socket?.on("match-found", (r: string) => {
        router.push(`/${r}`) 
        })

        // leave search if leave page
        return () => {
            console.log(cancelBtnRef.current); 
            if (!cancelBtnRef.current) socket?.emit("cancel-search"); 
        }
    }, [socket, nameModal])

    return (
        <div className="w-full min-h-screen flex flex-col justify-center bg-[#0E0E0E]">
            <Topbar />

            {nameModal && <div className="backdrop-blur-sm  top-0 left-0 z-0 fixed w-screen h-screen flex justify-center items-center text-white "> 
                <div className="z-15 bg-black p-3 w-[25vw] py-4 flex flex-col gap-y-4 rounded-2xl"> 
                    <p className="text-2xl font-bold tracking-tight">Enter a Nickname for yourself</p>
                    <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="BraveEntertainment..." className="w-full border-gray-500 bg-[#151515] active:outline-none focus:outline-none p-3 rounded-full" />
                    <button onClick={() => {
                        if (!nick) alert('enter a valid nickname')
                        onDone();
                        setNameModal(false)
                    }} className="w-full text-md rounded-full bg-[#6366f1] py-2 cursor-pointer hover:opacity-75 transition-opacity duration-150 linear">Done</button>
                </div>     
            </div>}

            <div className="max-w-7xl  h-full mt-9 mx-auto justify-center flex flex-col items-center ">
                <Target />

                <div className="text-white gap-y-4 flex flex-col">
                    <p className="text-4xl text-center font-bold tracking-wide">Finding Someone for You</p>
                    <p className="text-center text-lg animate-pulse -z-10 text-[#6366f1] font-mono">Connection Pending...</p>
                </div>

                <CancelBtn socket={socket!} btnRef={cancelBtnRef}/>
            </div>
        </div> 
    )
}

export default Start; 
