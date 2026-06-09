import {Target as TargetIcon} from "lucide-react"; 

const Target = () => {
    
    return (
        <div className="w-full h-96  flex justify-center items-center">
            <div className="animate-expand rounded-full border-3 border-[#6366f1]">
                <div className="w-24 h-24 flex justify-center items-center rounded-full bg-[#6366f1]">
                    <TargetIcon size={52} color="black"/>
                </div>
            </div>
        </div>
    )
}

export default Target; 
