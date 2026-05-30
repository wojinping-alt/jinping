import Link from "next/link";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Course = {
  id: string | number;
  title: string;
  description: string | null;
  price: number;
  video_url: string | null;
  is_free_preview?: boolean;
};

type EpisodeCount = {
  course_id: string | number;
};

function getDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("fetch failed")) {
    return "无法连接 Supabase 数据库。请检查当前网络是否能访问 supabase.co，或检查 NEXT_PUBLIC_SUPABASE_URL 配置。";
  }

  return message;
}

export default async function CoursesPage() {
  let courses: Course[] = [];
  let episodeCounts = new Map<string, number>();
  let databaseError = "";

  try {
    const result = await supabase
      .from("courses")
      .select("id,title,description,price,video_url,is_free_preview")
      .order("id", { ascending: true })
      .returns<Course[]>();

    if (result.error) {
      databaseError = getDatabaseErrorMessage(result.error);
    } else {
      courses = result.data || [];
    }

    const episodeResult = await supabase
      .from("course_episodes")
      .select("course_id")
      .returns<EpisodeCount[]>();

    if (!episodeResult.error) {
      episodeCounts = new Map(
        (episodeResult.data || []).reduce<[string, number][]>((items, episode) => {
          const key = String(episode.course_id);
          const found = items.find(([id]) => id === key);
          if (found) found[1] += 1;
          else items.push([key, 1]);
          return items;
        }, [])
      );
    }
  } catch (error) {
    databaseError = getDatabaseErrorMessage(error);
  }

  return (
    <main className="min-h-screen bg-[#f8f5f0] px-4 py-8 text-gray-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">汉字课程合集</h1>
            <p className="mt-2 text-gray-600">
              选择一个合集购买，购买后可在详情页观看全部集数。
            </p>
          </div>
          <Link
            href="/my-courses"
            className="inline-flex w-fit rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            我的课程
          </Link>
        </div>

        {databaseError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-white p-5 text-red-600 shadow-sm">
            <h2 className="font-bold">数据库连接失败</h2>
            <p className="mt-2 text-sm">{databaseError}</p>
            <p className="mt-2 text-sm text-gray-600">
              当前页面需要读取 Supabase 的 courses 表；多集目录需要先执行
              supabase-course-episodes.sql。
            </p>
          </div>
        )}

        {!databaseError && courses.length === 0 && (
          <div className="rounded-lg bg-white p-6 text-gray-600 shadow-sm">
            暂无课程，请先在 Supabase 的 courses 表里添加课程。
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {courses.map((course) => {
            const count = episodeCounts.get(String(course.id));

            return (
              <Link
                key={course.id}
                href={`/lesson/${course.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-950">
                      {course.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-gray-600">
                      {course.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                    {count ? `${count} 集` : "单课"}
                  </span>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-2xl font-bold text-red-500">
                    ¥{Number(course.price).toFixed(2)}
                  </p>
                  <span className="text-sm font-medium text-gray-700">
                    查看目录
                  </span>
                </div>

                {course.is_free_preview && (
                  <p className="mt-3 text-sm text-green-600">支持试看</p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
