"use client"
import {useRouter} from "next/navigation"

const Hero = () => {
    const router = useRouter();
    const floatingConfig = [
        {message: "Anybody into rust?", path: "M0,0 C40,-60 120,-60 160,0 C200,60 280,60 320,0 C280,-60 200,-60 160,0 C120,60 40,60 0,0", top: 0, left: 100}, 
        {message: "Hello.", path: "M20,40", top: 100, left: 100}, 
        {message: "Maze", path: "M20,40", top: 0, left: 0}
    ]
    return (
        <div className="w-full relative overflow-hidden h-full">
            <div className="absolute inset-0 justify-center z-10 w-full overflow-hidden flex flex-col items-center h-full">
                <div className="animate-glowpulse w-50 h-50 blur-[105px]"/>
                <div className="animate-glowpulsealt w-50 h-50 translate-x-50 [animation-delay:1.5s] blur-[125px]"/>
            </div>
            <div className="hidden lg:block absolute inset-0 z-0 left-100 top-50 w-96 h-84">
                {floatingConfig.map(item => (
                    <div key={item.message} style={{
                        left: `${item.left}%`, top: `${item.top}%`,    
                    }} className={`absolute text-white border border-white px-3 py-1 animate-float`}>
                        {item.message}
                    </div>
                ))}
            </div>
            <div className="absolute z-20 w-full h-full flex flex-col gap-y-2 lg:gap-y-6 items-center justify-center text-center"> 
               <p className="text-white text-5xl lg:text-7xl font-extrabold tracking-tigther leading-20">Talk to Someone New. <span className="text-transparent block bg-clip-text bg-linear-to-r from-blue-300 via-blue-600 to-blue-300">Instantly</span></p> 
               <p className="text-white text-md lg:text-xl tracking-wide font-bold">The fastest way to meet someone you've never met before.</p>

               <button onClick={() => router.push("/start")} className="px-8 cursor-pointer py-4 bg-[#4A4BD6] text-xl text-white rounded-lg shadow-[0px_0px_46px_-5px_#4A4BD6]">Start Chatting.</button>
               <p className="text-gray-300">Press Enter to start.</p>
            </div>

        </div>
    )
}

export default Hero;
