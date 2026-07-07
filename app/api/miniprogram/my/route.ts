import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type Course = {
  id: string | number;
  title: string;
  description: string | null;
  price: number | string;
};

type AccessRow = {
  course_id: string | number;
};

type EpisodeRow = {
  course_id: string | number;
  episode_number: number;
  title: string;
};

type OrderRow = {
  course_id: string | number;
  created_at?: string | null;
  paid_at?: string | null;
};

function getCourseCover(title: string) {
  if (title.includes("Q2") || title.includes("第2季")) return "/assets/xet/q2-cover.jpg";
  if (title.includes("Q1") || title.includes("第1季")) return "/assets/xet/q1-cover.jpg";
  return "/assets/xet/goods-pack.jpg";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function GET(req: Request) {
  const { supabase, user } = await getPayUser(req);

  if (!user) {
    return NextResponse.json({
      loggedIn: false,
      user: null,
      ownedCourses: [],
      stats: {
        account: 0,
        coupons: 0,
        favorites: 1,
        owned: 0,
        learningMinutes: 0,
      },
    });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const [accessResult, paidOrderResult] = await Promise.all([
    db
      .from("user_courses")
      .select("course_id")
      .eq("user_id", user.id)
      .returns<AccessRow[]>(),
    db
      .from("orders")
      .select("course_id,created_at,paid_at")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .returns<OrderRow[]>(),
  ]);

  if (accessResult.error) {
    return NextResponse.json({ error: accessResult.error.message }, { status: 500 });
  }

  if (paidOrderResult.error) {
    return NextResponse.json({ error: paidOrderResult.error.message }, { status: 500 });
  }

  const purchasedAtByCourse = new Map<string, string>();
  for (const row of accessResult.data || []) {
    const id = String(row.course_id);
    if (!purchasedAtByCourse.has(id)) {
      purchasedAtByCourse.set(id, "");
    }
  }

  for (const row of paidOrderResult.data || []) {
    const id = String(row.course_id);
    const paidAt = row.paid_at || row.created_at || "";
    const current = purchasedAtByCourse.get(id);
    if (!current || (paidAt && paidAt < current)) {
      purchasedAtByCourse.set(id, paidAt);
    }
  }

  const courseIds = Array.from(purchasedAtByCourse.keys()).filter(Boolean);
  if (!courseIds.length) {
    return NextResponse.json({
      loggedIn: true,
      user: {
        id: user.id,
        name: "字书用户",
        openid: "openid" in user ? user.openid : undefined,
      },
      ownedCourses: [],
      stats: {
        account: 0,
        coupons: 0,
        favorites: 1,
        owned: 0,
        learningMinutes: 0,
      },
    });
  }

  const [{ data: courses, error: coursesError }, { data: episodes, error: episodesError }] =
    await Promise.all([
      db
        .from("courses")
        .select("id,title,description,price")
        .in("id", courseIds)
        .order("id", { ascending: true })
        .returns<Course[]>(),
      db
        .from("course_episodes")
        .select("course_id,episode_number,title")
        .in("course_id", courseIds)
        .order("episode_number", { ascending: true })
        .returns<EpisodeRow[]>(),
    ]);

  if (coursesError) {
    return NextResponse.json({ error: coursesError.message }, { status: 500 });
  }

  if (episodesError) {
    return NextResponse.json({ error: episodesError.message }, { status: 500 });
  }

  const episodeStats = new Map<string, { count: number; latest: EpisodeRow | null }>();
  for (const episode of episodes || []) {
    const id = String(episode.course_id);
    const current = episodeStats.get(id) || { count: 0, latest: null };
    current.count += 1;
    if (!current.latest || episode.episode_number > current.latest.episode_number) {
      current.latest = episode;
    }
    episodeStats.set(id, current);
  }

  const ownedCourses = (courses || []).map((course) => {
    const id = String(course.id);
    const stats = episodeStats.get(id) || { count: 0, latest: null };
    return {
      id,
      title: course.title,
      description: course.description || "文字的 文化的 艺术的 一课三得",
      price: Number(course.price || 0),
      coverImage: getCourseCover(course.title || ""),
      purchaseTime: formatDateTime(purchasedAtByCourse.get(id)),
      latestUpdate: stats.latest
        ? `第${stats.latest.episode_number}集 ${stats.latest.title}`
        : "暂无更新",
      episodeCount: stats.count,
    };
  });

  return NextResponse.json({
    loggedIn: true,
    user: {
      id: user.id,
      name: "字书用户",
      openid: "openid" in user ? user.openid : undefined,
    },
    ownedCourses,
    stats: {
      account: 0,
      coupons: 0,
      favorites: 1,
      owned: ownedCourses.length,
      learningMinutes: 0,
    },
  });
}
