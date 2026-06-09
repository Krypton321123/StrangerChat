import Topbar from "./_components/landing/Topbar"; 
import Hero from "./_components/landing/Hero"

export default function Home() {

  return (
      <div className="w-full h-screen bg-[#141315]">
        <Topbar />

        <div className="max-w-6xl mx-auto">
            <Hero />
        </div>
      </div>
  );
}
