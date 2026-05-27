import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function CoursesPage() {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*");

  if (error) {
    return (
      <div className="p-10 text-red-500">
        数据库错误：{error.message}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <h1 className="mb-6 text-3xl font-bold text-orange-600">
        汉字课程
      </h1>

      <div className="space-y-6">
        {courses?.map((course) => (
          <Link
            key={course.id}
            href={`/lesson/${course.id}`}
            className="block rounded-2xl bg-white p-6 shadow hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-bold">
              {course.title}
            </h2>

            <p className="mt-2 text-gray-600">
              {course.description}
            </p>

            <p className="mt-4 text-lg text-red-500">
              ¥{course.price}
            </p>

            <video
              controls
              className="mt-4 w-full rounded-xl"
              src={course.video_url}
            />

            {course.is_free_preview && (
              <p className="mt-2 text-green-600">
                支持试看
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}