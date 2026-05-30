import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string | number;
  title: string;
  description: string | null;
  price: number;
  video_url: string;
  is_free_preview?: boolean;
};

function getDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("fetch failed")) {
    return "无法连接 Supabase 数据库。请检查当前网络是否能访问 supabase.co，或把 NEXT_PUBLIC_SUPABASE_URL 切换为可访问的代理/自定义域名。";
  }

  return message;
}

export default async function CoursesPage() {
  let courses: Course[] = [];
  let databaseError = "";

  try {
    const result = await supabase
      .from("courses")
      .select("id,title,description,price,video_url,is_free_preview")
      .returns<Course[]>();

    if (result.error) {
      databaseError = getDatabaseErrorMessage(result.error);
    } else {
      courses = result.data || [];
    }
  } catch (error) {
    databaseError = getDatabaseErrorMessage(error);
  }

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <h1 className="mb-6 text-3xl font-bold text-orange-600">汉字课程</h1>

      {databaseError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-white p-5 text-red-600 shadow-sm">
          <h2 className="font-bold">数据库连接失败</h2>
          <p className="mt-2 text-sm">{databaseError}</p>
          <p className="mt-2 text-sm text-gray-600">
            当前页面需要读取 Supabase 的 courses 表；支付、订单和已购课程也依赖同一个数据库。
          </p>
        </div>
      )}

      {!databaseError && courses.length === 0 && (
        <div className="rounded-xl bg-white p-6 text-gray-600 shadow-sm">
          暂无课程，请先在 Supabase 的 courses 表里添加课程。
        </div>
      )}

      <div className="space-y-6">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/lesson/${course.id}`}
            className="block rounded-2xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-2xl font-bold">{course.title}</h2>
            <p className="mt-2 text-gray-600">{course.description}</p>
            <p className="mt-4 text-lg text-red-500">￥{course.price}</p>

            <video
              controls
              className="mt-4 w-full rounded-xl"
              src={course.video_url}
            />

            {course.is_free_preview && (
              <p className="mt-2 text-green-600">支持试看</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

