"use client"
import { SquareArrowRightExit } from "lucide-react";
import { Socket } from "socket.io-client";

const Topbar = ({noOfUser, socket, roomId}: {noOfUser: number, socket: Socket, roomId: string | undefined}) => {

    const onLeave = () => {
        socket.emit("leave-room", roomId)
    }

    return (
        <div className="w-full border-b border-[#908fa0] py-4 fixed">
            <div className="max-w-7xl px-4 lg:px-0 flex mx-auto justify-between items-center">
                <div className="flex items-center gap-x-3">
                    <p className="text-3xl text-[#8083ff] font-bold">Stranger Chat</p>
                    <p className="border rounded-full border-[#908fa0] mt-1 font-bold text-white px-3 text-sm py-1 flex items-center justify-center gap-x-2"> <span className="block w-2 h-2 rounded-full bg-green-500 animate-pulse"/> {noOfUser} In Room</p>
                </div>
                <button onClick={onLeave} className="px-3 py-2 bg-red-900/20 flex gap-x-1 items-center whitespace-nowrap border border-red-500 rounded-xl text-red-500">
                    <SquareArrowRightExit /> Leave 
                </button>
            </div>
        </div>
    )
}

export default Topbar; 