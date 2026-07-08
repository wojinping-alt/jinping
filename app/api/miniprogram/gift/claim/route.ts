import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getPayUser } from "@/lib/pay-auth";

export async function POST(req: Request) {
  const { giftCode } = await req.json();

  if (!giftCode || typeof giftCode !== "string" || !giftCode.startsWith("MPGIFT")) {
    return NextResponse.json({ error: "礼物链接无效" }, { status: 400 });
  }

  const { user } = await getPayUser(req);
  if (!user) {
    return NextResponse.json({ error: "请先登录后领取" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,user_id,course_id,status,out_trade_no")
    .eq("out_trade_no", giftCode)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "礼物订单不存在" }, { status: 404 });
  }

  if (order.status === "gift_claimed") {
    return NextResponse.json({ error: "这份礼物已经被领取" }, { status: 409 });
  }

  if (order.status !== "paid") {
    return NextResponse.json({ error: "礼物还没有完成支付" }, { status: 409 });
  }

  const { error: accessError } = await supabase
    .from("user_courses")
    .upsert(
      {
        user_id: user.id,
        course_id: order.course_id,
      },
      { onConflict: "user_id,course_id" }
    );

  if (accessError) {
    return NextResponse.json({ error: accessError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "gift_claimed" })
    .eq("id", order.id)
    .eq("status", "paid");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ claimed: true, courseId: String(order.course_id) });
}
