"use client" 

import React, { createContext, useRef, useEffect, useContext, useState } from "react"
import {io, Socket} from "socket.io-client"; 

const SocketContext = createContext<Socket | null>(null); 

export function WebSocketProvider({ children } : {children: React.ReactNode}) {

    const [socket, setSocket] = useState<Socket | null>(null)

    useEffect(() => {
        if (!socket) {
            setSocket(io("localhost:3002")); 
        }

        return () => {
            socket?.close(); 
            setSocket(null);
        }
    }, [])

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext); 
