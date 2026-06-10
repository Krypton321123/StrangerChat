import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {v4 as uuid} from "uuid"

interface Message {
    messageId: string; 
    content: string; 
    sentBy: string;
    nick?: string;
    typingIndicator?: boolean;
}

const useTyping = (socket: Socket, messages: Message[], setMessages: Dispatch<SetStateAction<Message[]>>, users: any[]) => {

    const [typing, setTyping] = useState<Set<string>>(new Set()); 
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
    const messageIdsRef = useRef<Map<string, string>>(new Map()); 

    useEffect(() => {
        if (!users) return; 
        if (typing.size === 0 || users.length === 0) return; 

        typing.forEach((x) => {
            

            const user = users.find(u => u.socketId === x); 
            console.log(user);

            const alreadyTyping = messages.some((m) => {return (m.sentBy === user.userId) && m?.typingIndicator}); 
            if (alreadyTyping) return;
            const messageObj: Message = {
                content: "", 
                messageId: uuid(), 
                sentBy: user.userId, 
                nick: user.nick,
                typingIndicator: true
            }

            setMessages(prev => [...prev, messageObj])
            messageIdsRef.current.set(user.socketId, messageObj.messageId); 
        })
    }, [typing, users])

    useEffect(() => {
        if (!users || users.length === 0) return; 
        if (!messages || messages.length === 0) return; 

        const newMessage = messages[messages.length - 1]; 

        if (newMessage?.typingIndicator) return; 

        const socketId = users.find(u => u.userId === newMessage.sentBy); 

        if (messageIdsRef.current.has(socketId)) {
            const message = messageIdsRef.current.get(socketId); 

            setMessages(prev => prev.filter(p => p.messageId !== message));
            setTyping(prev => new Set([...prev].filter(x => x !== socketId)));
            clearTimeout(timeoutsRef.current.get(socketId))

        }
    }, [messages, users])

    useEffect(() => {
        if (!socket) return;
        socket.on("user-typing", socketId => {
            
            if (typing.has(socketId)) {
                clearTimeout(timeoutsRef.current.get(socketId)); 
                timeoutsRef.current.set(socketId, setTimeout(() => {
                    setTyping(prev => new Set([...prev].filter(x => x !== socketId))); 
                    setMessages(prev => prev.filter(m => m.messageId !== messageIdsRef.current.get(socketId))); 

                }, 4000));
            } else {
                setTyping(prev => new Set([...prev, socketId])); // add the socket id to typing track array 

                timeoutsRef.current.set(socketId, setTimeout(() => {
                    setTyping(prev => new Set([...prev].filter(x => x !== socketId))); 
                    setMessages(prev => prev.filter(m => m.messageId !== messageIdsRef.current.get(socketId))); 

                }, 4000)); 
            }
        })

        return () => {
            socket.off("user-typing")
        }

    }, [socket, typing])

    return typing; 

}

export default useTyping;