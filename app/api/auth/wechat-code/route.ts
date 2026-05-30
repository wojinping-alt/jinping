import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

type LoginCodeRecord = {
  code: string;
  wechat_user_id: string | null;
  nickname: string | null;
  expires_at: string;
  used_at: string | null;
};

function createSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getDatabaseSetupMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("wechat_login_codes") ||
    message.includes("relation") ||
    message.includes("schema cache")
  ) {
    return "缺少 Supabase 表 wechat_login_codes，请先创建验证码登录表。";
  }

  return message;
}

function buildLoginResponse(req: Request, record: LoginCodeRecord) {
  if (!record.wechat_user_id || !record.used_at) {
    return NextResponse.json({
      loggedIn: false,
      expiresAt: record.expires_at,
    });
  }

  const response = NextResponse.json({
    loggedIn: true,
    userId: `wechat:${record.wechat_user_id}`,
    name: record.nickname || "微信用户",
  });
  const isHttps = new URL(req.url).protocol === "https:";

  response.cookies.set("zishoo_user_id", `wechat:${record.wechat_user_id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.set(
    "zishoo_user_name",
    encodeURIComponent(record.nickname || "微信用户"),
    {
      httpOnly: false,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    }
  );
  response.cookies.set("zishoo_wechat_openid", record.wechat_user_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export async function POST() {
  try {
    const supabase = createAdminClient();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    for (let i = 0; i < 5; i += 1) {
      const code = createSixDigitCode();
      const { data, error } = await supabase
        .from("wechat_login_codes")
        .insert({
          code,
          expires_at: expiresAt,
        })
        .select("code,expires_at")
        .single();

      if (!error && data) {
        return NextResponse.json({
          code: data.code,
          expiresAt: data.expires_at,
        });
      }

      if (error && error.code !== "23505") {
        throw error;
      }
    }

    return NextResponse.json(
      { error: "验证码生成失败，请重试" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Create WeChat login code failed:", error);
    return NextResponse.json(
      { error: getDatabaseSetupMessage(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "验证码格式错误" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("wechat_login_codes")
      .select("code,wechat_user_id,nickname,expires_at,used_at")
      .eq("code", code)
      .maybeSingle<LoginCodeRecord>();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ loggedIn: false, expired: true });
    }

    if (new Date(data.expires_at).getTime() < Date.now() && !data.used_at) {
      return NextResponse.json({ loggedIn: false, expired: true });
    }

    return buildLoginResponse(req, data);
  } catch (error) {
    console.error("Check WeChat login code failed:", error);
    return NextResponse.json(
      { error: getDatabaseSetupMessage(error) },
      { status: 500 }
    );
  }
}

