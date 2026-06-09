import {create} from 'zustand'

type User = {
    userId: string; 
    socketId: string; 
    nick: string; 
    setUser: ({userId, socketId}: {userId: string, socketId: string}) => void; 
    setNick: (nick: string) => void; 
}

export const useUserStore = create<User>()((set) => ({
    userId: "", 
    socketId: "", 
    nick: "", 
    setUser: ({userId, socketId}: {userId: string, socketId: string}) => 
        set(() => ({
            userId: userId, socketId: socketId
        })), 
    setNick: (nick) => 
        set(() => ({
            nick
        }))
}))