'use client'
import {useParams} from "next/navigation"; 
import FloatingDock from "../_components/room/FloatingDock";

const Room = () => {
    const params = useParams(); 
    console.log(params)
    return (
        <div className="w-full h-screen bg-[#0E0E0E]">
            <div className="max-w-7xl mx-auto">
                <div className="w-full flex justify-center">
                    <FloatingDock />
                </div>
            </div> 
        </div>
    )
}

export default Room;