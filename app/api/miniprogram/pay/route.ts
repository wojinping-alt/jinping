import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";
import { verifyMiniProgramSession } from "@/lib/miniprogram-auth";
import {
  buildNotifyUrl,
  createJsapiPayParams,
  createWechatPayOrder,
} from "@/lib/wechat-pay";

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const session = token ? verifyMiniProgramSession(token) : null;

    if (!session) {
      return NextResponse.json({ error: "请先登录小程序" }, { status: 401 });
    }

    const { supabase, user } = await getPayUser(req);
    if (!user) {
      return NextResponse.json({ error: "请先登录小程序" }, { status: 401 });
    }

    const { courseId, gift } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "缺少课程 ID" }, { status: 400 });
    }

    if (!gift) {
      const { data: existingAccess } = await supabase
        .from("user_courses")
        .select("course_id")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingAccess) {
        return NextResponse.json({ paid: true, message: "课程已购买" });
      }
    }

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id,title,price")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: courseError?.message || "课程不存在" },
        { status: 404 }
      );
    }

    const amount = Number(course.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "课程价格配置错误" }, { status: 400 });
    }

    const outTradeNo = `${gift ? "MPGIFT" : "MP"}${Date.now()}${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const miniAppId = process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_PAY_APPID;

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
      description: `${gift ? "赠送课程" : "购买课程"} ${course.title}`.slice(0, 127),
      outTradeNo,
      amountFen: Math.round(amount * 100),
      notifyUrl: buildNotifyUrl(req),
      mode: "jsapi",
      appid: miniAppId,
      payerOpenid: session.openid,
      clientIp: getClientIp(req),
      userAgent: "miniProgram",
    });

    if (!payData.prepay_id) {
      return NextResponse.json({ error: "微信支付没有返回 prepay_id" }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      outTradeNo,
      payParams: createJsapiPayParams(payData.prepay_id, miniAppId),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建小程序支付失败" },
      { status: 500 }
    );
  }
}
