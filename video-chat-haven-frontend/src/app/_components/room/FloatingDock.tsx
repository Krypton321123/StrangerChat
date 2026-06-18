"use client"

import { Mic, MonitorUp, Video } from "lucide-react"

 

const FloatingDock = () => {

    const buttonConfig = [
        {name: "Mic", icon: <Mic /> }, 
        {name: "Video", icon: <Video />}, 
        {name: "Share", icon: <MonitorUp />}, 

    ]

  return (
    <div className=" text-white z-30 flex px-12 py-3 border border-gray-300  items-center bg-black gap-x-8 fixed bottom-20 rounded-full">
        {buttonConfig.map(item => {
            return (
                <button key={item.name} className="flex flex-col items-center justify-center text-center">
                    {item.icon} 
                    {item.name}
                </button>
            )
        })}
    </div>
  )
}

export default FloatingDock