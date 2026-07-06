import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";
import { verifyMiniProgramSession } from "@/lib/miniprogram-auth";
import {
  buildNotifyUrl,
  createJsapiPayParams,
  createWechatPayOrder,
} from "@/lib/wechat-pay";

const PRODUCT = {
  key: "pattern-design-service",
  title: "图形纹样创意应用",
  unitPrice: 1000,
  types: ["纹身", "手机", "服饰", "茶器", "酒标", "其他"],
};

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

    const body = await req.json();
    const productType = String(body.productType || "");
    const quantity = Math.max(1, Math.min(99, Number(body.quantity || 1)));

    if (!PRODUCT.types.includes(productType)) {
      return NextResponse.json({ error: "请选择有效的商品类型" }, { status: 400 });
    }

    if (!Number.isFinite(quantity)) {
      return NextResponse.json({ error: "购买数量不正确" }, { status: 400 });
    }

    const amount = PRODUCT.unitPrice * quantity;
    const outTradeNo = `MPG${Date.now()}${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const miniAppId = process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_PAY_APPID;

    const { data: order, error: orderError } = await supabase
      .from("product_orders")
      .insert({
        user_id: user.id,
        product_key: PRODUCT.key,
        product_title: PRODUCT.title,
        product_type: productType,
        quantity,
        amount,
        out_trade_no: outTradeNo,
        status: "pending",
      })
      .select("id,out_trade_no")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        {
          error:
            orderError?.message ||
            "创建商品订单失败，请先执行 supabase-product-orders.sql",
        },
        { status: 500 }
      );
    }

    const payData = await createWechatPayOrder({
      description: `${PRODUCT.title}-${productType}`.slice(0, 127),
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
      { error: error instanceof Error ? error.message : "创建商品支付失败" },
      { status: 500 }
    );
  }
}
