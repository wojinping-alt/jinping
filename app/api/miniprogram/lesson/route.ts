import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";

type Course = {
  id: string;
  title: string;
  description: string | null;
  price: number;
};

type Episode = {
  id: number;
  course_id: string;
  episode_number: number;
  title: string;
};

async function hasCourseAccess(
  supabase: Awaited<ReturnType<typeof getPayUser>>["supabase"],
  courseId: string,
  userId: string | undefined,
  price: number
) {
  if (price <= 0) return true;
  if (!userId) return false;

  const { data: access } = await supabase
    .from("user_courses")
    .select("course_id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (access) return true;

  const { data: paidOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .eq("status", "paid")
    .maybeSingle();

  return Boolean(paidOrder);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    return NextResponse.json({ error: "缺少 courseId" }, { status: 400 });
  }

  const { supabase, user } = await getPayUser(req);

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,title,description,price")
    .eq("id", courseId)
    .single<Course>();

  if (courseError || !course) {
    return NextResponse.json(
      { error: courseError?.message || "课程不存在" },
      { status: 404 }
    );
  }

  const { data: episodes, error: episodeError } = await supabase
    .from("course_episodes")
    .select("id,course_id,episode_number,title")
    .eq("course_id", courseId)
    .order("episode_number", { ascending: true })
    .returns<Episode[]>();

  if (episodeError) {
    return NextResponse.json({ error: episodeError.message }, { status: 500 });
  }

  const unlocked = await hasCourseAccess(
    supabase,
    courseId,
    user?.id,
    Number(course.price)
  );

  return NextResponse.json({
    course: {
      ...course,
      id: String(course.id),
      price: Number(course.price),
    },
    episodes: episodes || [],
    loggedIn: Boolean(user),
    unlocked,
  });
}
