import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { decryptWechatResource } from "@/lib/wechat-pay";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event_type !== "TRANSACTION.SUCCESS" || !body.resource) {
      return NextResponse.json({ code: "SUCCESS", message: "ignored" });
    }

    const transaction = decryptWechatResource(body.resource);
    const outTradeNo = transaction.out_trade_no;
    const tradeState = transaction.trade_state;

    if (!outTradeNo || tradeState !== "SUCCESS") {
      return NextResponse.json({ code: "SUCCESS", message: "ignored" });
    }

    const supabase = createAdminClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,user_id,course_id,status")
      .eq("out_trade_no", outTradeNo)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) {
      return NextResponse.json({ code: "SUCCESS", message: "order not found" });
    }

    if (order.status !== "paid") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          transaction_id: transaction.transaction_id,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;
    }

    const { error: accessError } = await supabase
      .from("user_courses")
      .upsert(
        {
          user_id: order.user_id,
          course_id: order.course_id,
        },
        { onConflict: "user_id,course_id" }
      );

    if (accessError) throw accessError;

    return NextResponse.json({ code: "SUCCESS", message: "success" });
  } catch (error) {
    console.error("WeChat Pay notify failed:", error);
    return NextResponse.json(
      { code: "FAIL", message: error instanceof Error ? error.message : "fail" },
      { status: 500 }
    );
  }
}

