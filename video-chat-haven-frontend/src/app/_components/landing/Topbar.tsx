"use client"
import useUserCount from "@/app/_hooks/useUserCount";


const Topbar = () => {

    const count = useUserCount(); 

  return (
    <div className="w-full h-12  bg-[#1E1E24]">
      <div className="max-w-7xl flex items-center justify-between h-full mx-auto">
        <p className="text-[#BEC3FF] text-xl font-extrabold">Stranger Chat</p>

        <div className="text-[12px] items-center gap-x-1 flex tracking-tighter px-2 py-0 bg-[#2A2A2B] font-bold text-[#C7C6D7] rounded-full border border-gray-300">
          <div
            style={{ boxShadow: "0px 0px 34px 0px rgba(190,194,255,0.79)" }}
            className="w-2 h-2 bg-[#BEC3FF] inset-1 shadow-2xl shadow-[#BEC3FF] opacity-75 animate-pulse rounded-4xl"
          />{" "}
          {count} Online now
        </div>
      </div>
    </div>
  );
};

export default Topbar;
