"use client"
import { Send } from "lucide-react";
import { Socket } from "socket.io-client";
import {v4 as uuid} from "uuid"
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/store/userStore";
interface Message {
    messageId: string; 
    content: string; 
    sentBy: string;
    nick?: string;
}

const Chat = ({socket, users, roomId} : {socket: Socket, users: any[], roomId: string}) => {
    const [message, setMessage] = useState("");     
    const [messages, setMessages] = useState<Message[]>([]); 
    const [focus, setFocus] = useState(false); 
    const [typing, setTyping] = useState<string[]>([])
    const userId = useUserStore(state => state.userId); 
    const inputRef = useRef<HTMLInputElement | null>(null);

    const onFocus = () => setFocus(true); 
    const onBlur = () => setFocus(false); 
    console.log(typing)

    useEffect(() => {
        if (!socket) return;
        socket.on("message-recieved", (m: Message) => {
            setMessages(prev => [...prev, m]); 
        })
        socket.on("user-typing", (id) => {

            if (!users || users.length === 0) return;
            console.log("user-typing", id);
            console.log("users", users)
            const typingUserId: string = users.find(u => u.socketId === id).userId; 
            console.log(typingUserId, "is this")
            let remove;
            if (!typingUserId) return; 

            if (typing.includes(typingUserId)) {clearTimeout(remove); remove = setTimeout(() => {
                setTyping(prev => prev.filter(x => x !== typingUserId))
            }, 4000); return;}; 

            setTyping(prev => [...prev, typingUserId])

            remove = setTimeout(() => {
                setTyping(prev => prev.filter(x => x !== typingUserId))
            }, 4000)
        })
    }, [socket, users])
    
    const onSendMessage = () => {
        if (!message) alert('Please enter a valid message'); 
        
        const messageObj: Message = {
            messageId: uuid(), 
            content: message,
            sentBy: userId,
        }

        setMessages(prev => [...prev, {...messageObj, nick: "You"}]); 
        setMessage("")

        socket.emit("send-chat-message", messageObj); 
    }

    useEffect(() => {
        
        if (focus) socket.emit("start-typing", roomId);
       
    }, [socket, focus])

    return (
        <div className="h-full w-[25vw] flex flex-col border-l border-[#464554]">
            <div className="h-24 bg-[#19191A] border-[#464554] border-b p-1 flex items-center">
                <p className="text-3xl ml-2.5 text-white font-semibold tracking-wide">Chat</p>
            </div> 
            <div className=" flex flex-1 flex-col gap-y-3 overflow-y-auto">
                {messages.length > 0 ? <div>
                    {messages.map(item => (
                        <div className={`w-full flex items-center ${item.sentBy === userId ? "justify-end" : "justify-start"}  text-white`} key={item.messageId}>
                            <div className=" text-white p-3 border-white gap-y-2 flex flex-col">
                            <p className="bg-transparent font-semibold text-end tracking-wider">{item.nick}</p>
                            <p className={`bg-[#343541] text-center p-3 rounded-b-xl ${item.sentBy === userId ? "rounded-tl-xl" : "rounded-tr-xl"} `}>{item.content}</p>
                            </div>
                        </div>
                    ))}
                </div> : <div className="flex flex-1 justify-center items-center border-b border-[#464554]">
                    <p className="text-white text-2xl">No messages yet.</p>
                </div>}
            </div>
            <div className="h-18 flex bg-[#19191A]">
                <div className="flex flex-1  items-center gap-x-2 px-8 ">
                    <input onBlur={onBlur} onFocus={onFocus} ref={inputRef} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a message..." className=" w-full h-3/4 px-2  bg-[#111112] text-white tracking-tight active:outline-none focus:outline-none rounded-lg"/>
                    <button onClick={onSendMessage} className="text-black bg-[#C0C1FF] p-2 rounded-xl hover:scale-125 transition-all duration-150 cursor-pointer"><Send size={20} /></button>
                </div>
            </div>
        </div>
    )
}

export default Chat; 