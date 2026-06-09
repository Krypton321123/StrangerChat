import { useEffect, useState } from "react";
import { useSocket } from "../_Providers/WebSocketProvider";

const useUserCount = () => {
    const [count, setCount] = useState(0)

    const socket = useSocket(); 

    useEffect(() => {
        socket?.on("returncount", n =>  setCount(n))
    }, [socket])

    return count; 
}

export default useUserCount; 