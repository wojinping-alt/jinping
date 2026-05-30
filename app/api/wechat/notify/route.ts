import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const outTradeNo = body.out_trade_no || body.outTradeNo;

    if (!outTradeNo) {
      return NextResponse.json({ success: true, message: "ignored" });
    }

    const supabase = createAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,user_id,course_id")
      .or(`out_trade_no.eq.${outTradeNo},id.eq.${outTradeNo}`)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ success: true, message: "order not found" });
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    if (updateError) throw updateError;

    const { error: accessError } = await supabase
      .from("user_courses")
      .upsert(
        { user_id: order.user_id, course_id: order.course_id },
        { onConflict: "user_id,course_id" }
      );

    if (accessError) throw accessError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Legacy WeChat notify failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "fail" },
      { status: 500 }
    );
  }
}

