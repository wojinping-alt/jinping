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

const hiddenCourseIds = new Set(["1", "201", "202", "203", "204"]);
const aiCollectionId = "103";
const aiEpisodeIds = ["201", "202", "203", "204"];

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

  const aiCollection = courses.find((course) => String(course.id) === aiCollectionId);
  const aiEpisodes = courses.filter((course) =>
    aiEpisodeIds.includes(String(course.id))
  );
  const visibleCourses = courses.filter(
    (course) =>
      !hiddenCourseIds.has(String(course.id)) &&
      String(course.id) !== aiCollectionId
  );

  return (
    <main className="min-h-screen bg-[#f8f5f0] px-4 py-8 text-gray-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">汉字课程合集</h1>
            <p className="mt-2 text-gray-600">
              选择课程购买，购买后可在详情页观看对应视频。
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
          </div>
        )}

        {!databaseError && courses.length === 0 && (
          <div className="rounded-lg bg-white p-6 text-gray-600 shadow-sm">
            暂无课程，请先在 Supabase 的 courses 表里添加课程。
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {aiCollection && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-950">
                    汉字就这么简单
                  </h2>
                  <p className="mt-2 text-gray-600">
                    可选择购买完整合集，也可按单集购买。
                  </p>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                  {episodeCounts.get(aiCollectionId) || aiEpisodes.length} 集
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-2xl font-bold text-red-500">
                  合集 ¥{Number(aiCollection.price).toFixed(2)}
                </p>
                <a
                  href={`/lesson/${aiCollection.id}`}
                  className="inline-flex justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
                >
                  合集付费
                </a>
              </div>

              {aiEpisodes.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">
                    按集付费
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {aiEpisodes.map((episode) => (
                      <a
                        key={episode.id}
                        href={`/lesson/${episode.id}`}
                        className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-orange-300 hover:bg-orange-50"
                      >
                        <span className="block truncate">{episode.title}</span>
                        <span className="mt-1 block text-red-500">
                          ¥{Number(episode.price).toFixed(2)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {visibleCourses.map((course) => {
            const count = episodeCounts.get(String(course.id));

            return (
              <a
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
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
