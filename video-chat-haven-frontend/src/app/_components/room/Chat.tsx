"use client"
import { Send } from "lucide-react";
import { Socket } from "socket.io-client";
import {v4 as uuid} from "uuid"
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/store/userStore";
import useTyping from "@/app/_hooks/useTyping";
import {ThreeDots} from "react-loader-spinner"
interface Message {
    messageId: string; 
    content: string; 
    sentBy: string;
    nick?: string;
    typingIndicator?: boolean; 
}

const Chat = ({socket, users, roomId} : {socket: Socket, users: any[], roomId: string}) => {
    const [message, setMessage] = useState("");     
    const [messages, setMessages] = useState<Message[]>([]); 
    const [focus, setFocus] = useState(false); 
    const typing = useTyping(socket, messages, setMessages, users); 
    const userId = useUserStore(state => state.userId); 
    const inputRef = useRef<HTMLInputElement | null>(null);
    let   timeoutRef = useRef<any>(null)

    const onFocus = () => setFocus(true); 
    const onBlur = () => setFocus(false); 

    useEffect(() => {
        if (!socket) return;
        socket.on("message-recieved", (m: Message) => {
            console.log("Recieved"); 
            setMessages(prev => [...prev, m]); 
        })
    }, [socket])

    console.log("TYPING:", typing)

    const onSendMessage = () => {
        if (!message) return alert('Please enter a valid message'); 
        
        const messageObj: Message = {
            messageId: uuid(), 
            content: message,
            sentBy: userId,
        }

        setMessages(prev => {
            console.log("messages", prev)
            if (prev[prev.length - 1]?.typingIndicator) {
                const withoutTyping = prev.slice(0, prev.length - 1) 
                return [...withoutTyping, messageObj, prev[prev.length - 1]]; 
            } else {
                return [...prev, messageObj]; 
            }
        }); 
        setMessage("")

        socket.emit("send-chat-message", messageObj); 
    }

    useEffect(() => {
        
        if (!focus) {
            if (timeoutRef.current) return clearTimeout(timeoutRef.current); 
            else return;
        } 
        
        socket.emit("start-typing", roomId); 
        timeoutRef.current = setTimeout(() => {
            console.log("came here in time out of focus");
            if (focus) socket.emit("start-typing", roomId);  
        }, 4000)
       
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
                            <p className={`bg-[#343541] text-center p-3 rounded-b-xl ${item.sentBy === userId ? "rounded-tl-xl" : "rounded-tr-xl"} `}>{item.typingIndicator ? <ThreeDots height="18" width="18" color="#fff"/> : item.content}</p>
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