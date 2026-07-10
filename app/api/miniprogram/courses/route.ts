import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type Course = {
  id: string | number;
  title: string;
  description: string | null;
  price: number;
};

type EpisodeCount = {
  course_id: string | number;
};

type SubscriberRow = {
  course_id: string | number;
  user_id: string | null;
};

const hiddenCourseIds = new Set(["1", "201", "202", "203", "204"]);

export async function GET() {
  const supabase = createAdminClient();

  const { data: courses, error } = await supabase
    .from("courses")
    .select("id,title,description,price")
    .order("id", { ascending: true })
    .returns<Course[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: episodes } = await supabase
    .from("course_episodes")
    .select("course_id")
    .returns<EpisodeCount[]>();

  const { data: userCourses } = await supabase
    .from("user_courses")
    .select("course_id,user_id")
    .returns<SubscriberRow[]>();

  const { data: paidOrders } = await supabase
    .from("orders")
    .select("course_id,user_id")
    .eq("status", "paid")
    .returns<SubscriberRow[]>();

  const episodeCounts = new Map<string, number>();
  for (const episode of episodes || []) {
    const key = String(episode.course_id);
    episodeCounts.set(key, (episodeCounts.get(key) || 0) + 1);
  }

  const subscriberSets = new Map<string, Set<string>>();
  for (const row of [...(userCourses || []), ...(paidOrders || [])]) {
    if (!row.user_id) continue;
    const key = String(row.course_id);
    const set = subscriberSets.get(key) || new Set<string>();
    set.add(String(row.user_id));
    subscriberSets.set(key, set);
  }

  return NextResponse.json({
    courses: (courses || [])
      .filter((course) => !hiddenCourseIds.has(String(course.id)))
      .map((course) => ({
        ...course,
        id: String(course.id),
        price: Number(course.price),
        episodeCount: episodeCounts.get(String(course.id)) || 0,
        subscriberCount: subscriberSets.get(String(course.id))?.size || 0,
      })),
  });
}
