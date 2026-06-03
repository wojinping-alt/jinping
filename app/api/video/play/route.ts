import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";
import { maskVideoUser, signVodUrl } from "@/lib/video-security";

type Course = {
  id: string;
  title: string;
  price: number;
  video_url: string | null;
};

type EpisodeRow = {
  id: number;
  course_id: string;
  episode_number: number;
  title: string;
  video_url: string | null;
};

async function hasCourseAccess(
  supabase: Awaited<ReturnType<typeof getPayUser>>["supabase"],
  userId: string,
  course: Course
) {
  if (Number(course.price) <= 0) return true;

  const { data: access } = await supabase
    .from("user_courses")
    .select("course_id")
    .eq("user_id", userId)
    .eq("course_id", course.id)
    .maybeSingle();

  if (access) return true;

  const { data: paidOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("course_id", course.id)
    .eq("user_id", userId)
    .eq("status", "paid")
    .maybeSingle();

  return Boolean(paidOrder);
}

export async function GET(req: Request) {
  const { supabase, user } = await getPayUser(req);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const episodeId = searchParams.get("episodeId");

  if (!courseId) {
    return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,title,price,video_url")
    .eq("id", courseId)
    .single<Course>();

  if (courseError || !course) {
    return NextResponse.json(
      { error: courseError?.message || "课程不存在" },
      { status: 404 }
    );
  }

  const allowed = await hasCourseAccess(supabase, user.id, course);

  if (!allowed) {
    return NextResponse.json({ error: "请先购买课程" }, { status: 403 });
  }

  let videoUrl = course.video_url;
  let episodeTitle = course.title;

  if (episodeId) {
    const { data: episode, error: episodeError } = await supabase
      .from("course_episodes")
      .select("id,course_id,episode_number,title,video_url")
      .eq("id", episodeId)
      .eq("course_id", courseId)
      .single<EpisodeRow>();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: episodeError?.message || "课时不存在" },
        { status: 404 }
      );
    }

    videoUrl = episode.video_url;
    episodeTitle = episode.title;
  }

  if (!videoUrl) {
    return NextResponse.json({ error: "视频还没有配置播放地址" }, { status: 404 });
  }

  const signed = await signVodUrl(videoUrl, user.id);
  const displayUser = maskVideoUser(user.email || user.id);

  return NextResponse.json(
    {
      courseId,
      episodeId,
      title: episodeTitle,
      playUrl: signed.url,
      expiresAt: signed.expiresAt,
      signed: signed.signed,
      watermark: `${displayUser} ${new Date().toLocaleString("zh-CN", {
        hour12: false,
        timeZone: "Asia/Shanghai",
      })}`,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
