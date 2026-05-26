export default function Home() {
  return (
    <main className="min-h-screen bg-[#FFF8EE] flex flex-col items-center justify-center px-6 text-center">
      
      <div className="text-6xl mb-4">📚</div>

      <h1 className="text-4xl md:text-6xl font-bold text-[#D97706] mb-6">
        汉字启蒙
      </h1>

      <p className="text-lg md:text-2xl text-[#6B4F3B] max-w-xl mb-10">
        用动画和故事，让孩子真正理解汉字，而不是死记硬背
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        
        <a
          href="/courses"
          className="bg-[#F59E0B] hover:bg-[#D97706] text-white text-lg font-semibold py-4 rounded-full"
        >
          开始学习
        </a>

        <a
          href="/lesson"
          className="border border-[#D97706] text-[#D97706] text-lg font-semibold py-4 rounded-full"
        >
          试听课程
        </a>

      </div>

    </main>
  );
}