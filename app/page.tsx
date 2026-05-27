import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-5xl font-bold text-orange-600">
        字书 Zishoo
      </h1>

      <p className="mt-6 text-lg text-gray-600 text-center max-w-xl">
        用动画和故事学习汉字，让中文学习更有趣。
      </p>

      <Link
        href="/courses"
        className="mt-10 rounded-2xl bg-orange-500 px-8 py-4 text-white text-xl shadow hover:bg-orange-600"
      >
        进入课程
      </Link>   <p className="mt-4 text-green-600 text-xl">
        部署测试成功
      </p>
    </main>
  );
}