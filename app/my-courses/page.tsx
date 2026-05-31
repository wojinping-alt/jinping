import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { toStableUuid } from "@/lib/stable-id";

type Course = {
  id: string | number;
  title: string;
  description: string | null;
};

type UserCourse = {
  course_id: string | number;
};

export default async function MyCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const rawUserId = user?.id || cookieStore.get("zishoo_user_id")?.value;
  const userId = rawUserId ? toStableUuid(rawUserId) : undefined;

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#f8f5f0] p-8">
        <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-gray-700">请先登录后查看已购买课程。</p>
          <Link
            href="/login?next=/my-courses"
            className="mt-4 inline-flex rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            去登录
          </Link>
        </div>
      </main>
    );
  }

  const { data: userCourses } = await supabase
    .from("user_courses")
    .select("course_id")
    .eq("user_id", userId)
    .returns<UserCourse[]>();

  const courseIds = userCourses?.map((item) => item.course_id) || [];

  let courses: Course[] = [];

  if (courseIds.length > 0) {
    const { data } = await supabase
      .from("courses")
      .select("id,title,description")
      .in("id", courseIds)
      .returns<Course[]>();

    courses = data || [];
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] px-4 py-8 text-gray-950 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-950">我的课程</h1>

        {courses.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
            你还没有购买课程。
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <a
              key={course.id}
              href={`/lesson/${course.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h2 className="text-2xl font-bold">{course.title}</h2>
              <p className="mt-2 text-gray-600">{course.description}</p>
              <p className="mt-5 text-sm font-medium text-gray-700">
                继续学习
              </p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
