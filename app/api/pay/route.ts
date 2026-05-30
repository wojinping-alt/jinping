import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";
import {
  buildNotifyUrl,
  createWechatPayOrder,
  detectPayMode,
} from "@/lib/wechat-pay";

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getPayUser(req);

    if (!user) {
      return NextResponse.json({ error: "请先登录后再购买课程" }, { status: 401 });
    }

    const { courseId } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "缺少课程 ID" }, { status: 400 });
    }

    const { data: existingAccess } = await supabase
      .from("user_courses")
      .select("course_id")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingAccess) {
      return NextResponse.json({ paid: true, message: "课程已购买" });
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id,title,price")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    const amount = Number(course.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "课程价格配置错误" }, { status: 400 });
    }

    const outTradeNo = `HS${Date.now()}${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const userAgent = req.headers.get("user-agent") || "";
    const mode = detectPayMode(userAgent);

    if (mode === "jsapi") {
      return NextResponse.json(
        {
          mode,
          error:
            "微信内自动支付需要先绑定用户 openid。请在手机浏览器打开本页使用微信 H5 支付，或后续接入公众号 OAuth 后启用 JSAPI。",
        },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        course_id: course.id,
        out_trade_no: outTradeNo,
        amount,
        status: "pending",
      })
      .select("id,out_trade_no")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message || "创建订单失败" },
        { status: 500 }
      );
    }

    const payData = await createWechatPayOrder({
      description: `购买课程 ${course.title}`.slice(0, 127),
      outTradeNo,
      amountFen: Math.round(amount * 100),
      notifyUrl: buildNotifyUrl(req),
      mode,
      clientIp:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "127.0.0.1",
      userAgent,
    });

    return NextResponse.json({
      orderId: order.id,
      outTradeNo,
      mode,
      codeUrl: payData.code_url,
      h5Url: payData.h5_url,
    });
  } catch (error) {
    console.error("Create payment failed:", error);
    const message = error instanceof Error ? error.message : "创建支付失败";
    const friendlyMessage = message.includes("out_trade_no")
      ? "数据库 orders 表缺少 out_trade_no 字段，请先执行 supabase-payment-schema.sql。"
      : message;

    return NextResponse.json(
      { error: friendlyMessage },
      { status: 500 }
    );
  }
}
