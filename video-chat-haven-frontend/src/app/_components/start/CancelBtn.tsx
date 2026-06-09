"use client" 

import {X} from "lucide-react"; 
import {useRouter} from "next/navigation"; 

const CancelBtn = () => {
    const router = useRouter()

    const onCancel = () => {
        router.replace("/");
    }
     
    return (
        <button onClick={onCancel} className="bg-transparent text-white px-3 py-2 flex gap-x-2 border border-white rounded-lg mt-10 hover:opacity-75 transition-opacity ease-in duration-300">
            <X /> Cancel Request
        </button>
    )
}

export default CancelBtn; 
