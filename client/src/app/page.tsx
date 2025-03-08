import Link from "next/link";

export default function HomePage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full flex items-center justify-center">
      <Link href="/table/1">
        <button
          className="px-16 py-8 bg-[#25262b] rounded-xl text-white text-4xl font-bold
        hover:bg-[#2c2d31] hover:scale-105 hover:shadow-2xl
        transition-all duration-300 ease-in-out
        font-['Montserrat']
        tracking-wider
        animate-pulse"
          aria-label="start game"
        >
          Get Started
        </button>
      </Link>
    </div>
  );
}
