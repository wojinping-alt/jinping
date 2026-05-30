import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";

export async function GET(req: Request) {
  const { supabase, user } = await getPayUser(req);

  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const courseId = searchParams.get("courseId");

  if (!orderId && !courseId) {
    return NextResponse.json(
      { error: "缺少 orderId 或 courseId" },
      { status: 400 }
    );
  }

  if (courseId) {
    const { data: access } = await supabase
      .from("user_courses")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (access) {
      return NextResponse.json({ paid: true });
    }
  }

  if (!orderId) {
    return NextResponse.json({ paid: false });
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("status,course_id")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    paid: order?.status === "paid",
    status: order?.status || "not_found",
    courseId: order?.course_id,
  });
}
