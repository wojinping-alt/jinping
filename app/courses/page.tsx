export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-[#FFF8EE] p-6">
      
      {/* 标题 */}
      <h1 className="text-3xl md:text-4xl font-bold text-[#D97706] mb-8">
        汉字启蒙课程
      </h1>

      {/* 课程列表 */}
      <div className="grid gap-5 max-w-2xl mx-auto">

        {/* 课程1 */}
        <a href="/lesson" className="bg-white p-5 rounded-2xl shadow hover:shadow-lg transition">
          <h2 className="text-xl font-bold text-[#92400E]">
            第一课：日月水火
          </h2>
          <p className="text-gray-600 mt-2">
            适合3-6岁儿童 · 汉字起源启蒙
          </p>
        </a>

        {/* 课程2 */}
        <a href="/lesson" className="bg-white p-5 rounded-2xl shadow hover:shadow-lg transition">
          <h2 className="text-xl font-bold text-[#92400E]">
            第二课：山川草木
          </h2>
          <p className="text-gray-600 mt-2">
            自然汉字认知 · 图像联想学习
          </p>
        </a>

        {/* 课程3 */}
        <a href="/lesson" className="bg-white p-5 rounded-2xl shadow hover:shadow-lg transition">
          <h2 className="text-xl font-bold text-[#92400E]">
            第三课：人物与家庭
          </h2>
          <p className="text-gray-600 mt-2">
            生活汉字 · 建立语言基础
          </p>
        </a>

      </div>

    </main>
  );
}