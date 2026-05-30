import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type MessageBody = {
  userID?: string;
  userId?: string;
  openid?: string;
  fromUserName?: string;
  yzm?: string;
  code?: string;
  content?: string;
  nickname?: string;
  token?: string;
};

function getToken(req: Request, body: MessageBody) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1];

  return (
    bearer ||
    url.searchParams.get("token") ||
    body.token ||
    req.headers.get("x-wechat-token") ||
    ""
  );
}

function verifyToken(req: Request, body: MessageBody) {
  const expected = process.env.WECHAT_API_SECRET;
  if (!expected) return true;

  return getToken(req, body) === expected;
}

function pickCode(body: MessageBody) {
  const raw = body.yzm || body.code || body.content || "";
  const match = raw.match(/\b\d{6}\b/);
  return match?.[0] || "";
}

function pickWechatUserId(body: MessageBody) {
  return body.userID || body.userId || body.openid || body.fromUserName || "";
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const body: MessageBody = contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries(new URLSearchParams(await req.text()));

    if (!verifyToken(req, body)) {
      return NextResponse.json({ error: "token 无效" }, { status: 403 });
    }

    const code = pickCode(body);
    const wechatUserId = pickWechatUserId(body);

    if (!wechatUserId) {
      return NextResponse.json({ error: "缺少微信用户 ID" }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ error: "缺少 6 位验证码" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("wechat_login_codes")
      .update({
        wechat_user_id: wechatUserId,
        nickname: body.nickname || "微信用户",
        used_at: now,
      })
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", now)
      .select("code")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "验证码无效、已过期或已使用" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "登录成功，请回到网页继续",
    });
  } catch (error) {
    console.error("WeChat message login failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "处理失败" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "公众号验证码登录接口，请用 POST 提交 userID 和 yzm。",
  });
}

