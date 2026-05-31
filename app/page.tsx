import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-orange-50 p-6 text-center">
      <h1 className="max-w-4xl text-4xl font-bold leading-tight text-orange-600 sm:text-6xl">
        一眼千年，重新看懂汉字之美
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-700">
        从 300 个种子字出发，理解文字构形、书体演变与书法造型，让识字与书写回到同一条文化脉络。
      </p>

      <Link
        href="/courses"
        className="mt-10 rounded-2xl bg-orange-500 px-8 py-4 text-xl text-white shadow hover:bg-orange-600"
      >
        进入课程
      </Link>
    </main>
  );
}
