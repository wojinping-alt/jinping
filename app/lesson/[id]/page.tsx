import EpisodePlayer, { type Episode } from "@/components/EpisodePlayer";
import LoginAwarePurchaseButton from "@/components/LoginAwarePurchaseButton";
import PayButton from "@/components/PayButton";
import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { toStableUuid } from "@/lib/stable-id";

type Course = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  video_url: string | null;
};

type LessonState = {
  error?: string;
  course?: Course;
  userId?: string;
  hasPaid?: boolean;
  episodes?: Episode[];
};

function getDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("fetch failed")) {
    return "无法连接 Supabase 数据库。请检查当前网络是否能访问 supabase.co。";
  }

  return message;
}

async function loadLesson(id: string): Promise<LessonState> {
  const supabase = await createClient();

  try {
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id,title,description,price,video_url")
      .eq("id", id)
      .single<Course>();

    if (courseError) {
      return { error: getDatabaseErrorMessage(courseError) };
    }

    if (!course) {
      return { error: "课程不存在" };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const cookieStore = await cookies();
    const rawUserId = user?.id || cookieStore.get("zishoo_user_id")?.value;
    const userId = rawUserId ? toStableUuid(rawUserId) : undefined;

    let hasPaid = Number(course.price) <= 0;

    if (userId && !hasPaid) {
      const { data: access } = await supabase
        .from("user_courses")
        .select("course_id")
        .eq("course_id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (access) {
        hasPaid = true;
      } else {
        const { data: paidOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("course_id", id)
          .eq("user_id", userId)
          .eq("status", "paid")
          .maybeSingle();

        hasPaid = !!paidOrder;
      }
    }

    const { data: episodeRows, error: episodeError } = await supabase
      .from("course_episodes")
      .select("id,episode_number,title,video_url")
      .eq("course_id", id)
      .order("episode_number", { ascending: true })
      .returns<Episode[]>();

    const episodes =
      episodeError || !episodeRows
        ? []
        : episodeRows.map((episode) => ({
            ...episode,
            video_url: hasPaid ? episode.video_url : null,
          }));

    return {
      course: {
        ...course,
        video_url: hasPaid ? course.video_url : null,
      },
      userId,
      hasPaid,
      episodes,
    };
  } catch (error) {
    return { error: getDatabaseErrorMessage(error) };
  }
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const state = await loadLesson(id);

  if (state.error || !state.course) {
    return <div className="p-6 text-red-500">数据库连接失败：{state.error}</div>;
  }

  const { course, userId } = state;
  const hasPaid = Boolean(state.hasPaid);
  const episodes = state.episodes || [];

  return (
    <main className="min-h-screen bg-[#f8f5f0] px-4 py-8 text-gray-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">
                {episodes.length > 1 ? `共 ${episodes.length} 集` : "课程详情"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-gray-950">
                {course.title}
              </h1>
              <p className="mt-3 max-w-3xl text-gray-600">
                {course.description}
              </p>
            </div>
            <div className="shrink-0">
              <p className="mb-3 text-2xl font-bold text-red-500">
                ¥{Number(course.price).toFixed(2)}
              </p>
              {!hasPaid && !userId ? (
                <LoginAwarePurchaseButton courseId={course.id} />
              ) : !hasPaid ? (
                <PayButton
                  courseId={course.id}
                  price={course.price}
                  userId={userId}
                />
              ) : (
                <div className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  已购买，课程已解锁
                </div>
              )}
            </div>
          </div>
        </div>

        <EpisodePlayer
          courseId={course.id}
          episodes={episodes}
          fallbackVideoUrl={course.video_url}
          unlocked={hasPaid}
        />
      </div>
    </main>
  );
}
