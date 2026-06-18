import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type Course = {
  id: string | number;
  title: string;
  description: string | null;
  price: number;
};

type EpisodeCount = {
  course_id: string | number;
};

const hiddenCourseIds = new Set(["1", "201", "202", "203", "204"]);

export async function GET() {
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

  const counts = new Map<string, number>();
  for (const episode of episodes || []) {
    const key = String(episode.course_id);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return NextResponse.json({
    courses: (courses || [])
      .filter((course) => !hiddenCourseIds.has(String(course.id)))
      .map((course) => ({
        ...course,
        id: String(course.id),
        price: Number(course.price),
        episodeCount: counts.get(String(course.id)) || 0,
      })),
  });
}
