import VideoPlayer from "@/components/VideoPlayer";
import PayButton from "@/components/PayButton";
import { createClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";

type LessonState =
  | { error: string; course?: never; userId?: never; hasPaid?: never }
  | {
      error?: never;
      course: {
        id: string;
        title: string;
        description: string | null;
        price: number;
        video_url: string;
      };
      userId?: string;
      hasPaid: boolean;
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
      .single();

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
    const userId = user?.id || cookieStore.get("zishoo_user_id")?.value;

    let hasPaid = false;

    if (userId) {
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

    return {
      course,
      userId,
      hasPaid,
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

  if (state.error) {
    return (
      <div className="p-6 text-red-500">数据库连接失败：{state.error}</div>
    );
  }

  if (!state.course) {
    return <div className="p-6 text-red-500">课程不存在</div>;
  }

  const { course, hasPaid, userId } = state;

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <h1 className="text-4xl font-bold text-orange-600">{course.title}</h1>
      <p className="mt-4 text-gray-700">{course.description}</p>
      <p className="mt-4 text-2xl text-red-500">￥{course.price}</p>

      {!hasPaid && (
        <div className="mt-6">
          <PayButton courseId={course.id} price={course.price} userId={userId} />
        </div>
      )}

      {hasPaid ? (
        <div className="mt-6">
          <VideoPlayer src={course.video_url} courseId={course.id} unlocked />
        </div>
      ) : (
        <div className="mt-6 rounded bg-yellow-100 p-4 text-yellow-900">
          请先购买课程后观看完整内容
        </div>
      )}
    </div>
  );
}
