import Topbar from "./_components/landing/Topbar"; 
import Hero from "./_components/landing/Hero"

export default function Home() {

  return (
      <div className="w-full min-h-screen bg-[#141315]">
        <Topbar />

        <div className="max-w-6xl h-screen mx-auto lg:px-8 md:px-6">
            <Hero />
        </div>
      </div>
  );
}
