import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";

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
  const userId = user?.id || cookieStore.get("zishoo_user_id")?.value;

  if (!userId) {
    return <div className="p-10">请先登录</div>;
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
    <div className="min-h-screen bg-orange-50 p-6">
      <h1 className="mb-6 text-4xl font-bold text-orange-600">我的课程</h1>

      {courses.length === 0 && <p>你还没有购买课程</p>}

      <div className="space-y-6">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/lesson/${course.id}`}
            className="block rounded-2xl bg-white p-6 shadow"
          >
            <h2 className="text-2xl font-bold">{course.title}</h2>
            <p className="mt-2 text-gray-600">{course.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

