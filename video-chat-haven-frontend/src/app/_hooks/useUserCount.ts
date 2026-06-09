import { useEffect, useState } from "react";
import { useSocket } from "../_Providers/WebSocketProvider";
import { useUserStore } from "@/store/userStore";

const useUserCount = () => {
    const [count, setCount] = useState(0)
    const setUser = useUserStore((state) => state.setUser); 

    const socket = useSocket(); 

    useEffect(() => {
        socket?.on("init-user", (user: any) => {setUser({userId: user.userId, socketId: socket.id!})})
        socket?.on("user-count", (n: number) => setCount(n)); 
    }, [socket])

    return count; 
}

export default useUserCount; 