import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";
import { createAdminClient } from "@/lib/supabase-admin";

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

type SubscriberRow = {
  user_id: string | null;
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
  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const { data: course, error: courseError } = await db
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

  const { data: episodes, error: episodeError } = await db
    .from("course_episodes")
    .select("id,course_id,episode_number,title")
    .eq("course_id", courseId)
    .order("episode_number", { ascending: true })
    .returns<Episode[]>();

  if (episodeError) {
    return NextResponse.json({ error: episodeError.message }, { status: 500 });
  }

  const unlocked = await hasCourseAccess(
    db,
    courseId,
    user?.id,
    Number(course.price)
  );

  const [{ data: userCourses }, { data: paidOrders }] = await Promise.all([
    db
      .from("user_courses")
      .select("user_id")
      .eq("course_id", courseId)
      .returns<SubscriberRow[]>(),
    db
      .from("orders")
      .select("user_id")
      .eq("course_id", courseId)
      .eq("status", "paid")
      .returns<SubscriberRow[]>(),
  ]);

  const subscriberIds = new Set(
    [...(userCourses || []), ...(paidOrders || [])]
      .map((row) => row.user_id)
      .filter(Boolean)
      .map(String)
  );

  return NextResponse.json({
    course: {
      ...course,
      id: String(course.id),
      price: Number(course.price),
      subscriberCount: subscriberIds.size,
    },
    episodes: episodes || [],
    loggedIn: Boolean(user),
    unlocked,
  });
}
