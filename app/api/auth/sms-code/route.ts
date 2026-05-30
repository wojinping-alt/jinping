import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  createSmsCode,
  hashSmsCode,
  maskPhone,
  normalizeChinaPhone,
  sendTencentSmsCode,
} from "@/lib/sms";

const EXPIRE_MINUTES = Number(process.env.SMS_CODE_EXPIRE_MINUTES || "5");
const SEND_INTERVAL_SECONDS = Number(
  process.env.SMS_CODE_SEND_INTERVAL_SECONDS || "60"
);
const TEST_SMS_CODE = process.env.TEST_SMS_CODE || "123456";

function hasTencentSmsConfig() {
  return Boolean(
    process.env.TENCENTCLOUD_SECRET_ID &&
      process.env.TENCENTCLOUD_SECRET_KEY &&
      process.env.TENCENT_SMS_SDK_APP_ID &&
      process.env.TENCENT_SMS_SIGN_NAME &&
      process.env.TENCENT_SMS_TEMPLATE_ID
  );
}

function getDatabaseSetupMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("sms_login_codes") ||
    message.includes("relation") ||
    message.includes("schema cache")
  ) {
    return "缺少 Supabase 表 sms_login_codes，请先创建手机验证码登录表。";
  }

  return message;
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    const normalized = normalizeChinaPhone(phone || "");
    const supabase = createAdminClient();
    const intervalSince = new Date(
      Date.now() - SEND_INTERVAL_SECONDS * 1000
    ).toISOString();

    const { data: recent, error: recentError } = await supabase
      .from("sms_login_codes")
      .select("created_at")
      .eq("phone", normalized.e164)
      .gt("created_at", intervalSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentError) throw recentError;
    if (recent) {
      return NextResponse.json(
        { error: `发送太频繁，请 ${SEND_INTERVAL_SECONDS} 秒后再试` },
        { status: 429 }
      );
    }

    const code = hasTencentSmsConfig() ? createSmsCode() : TEST_SMS_CODE;
    const expiresAt = new Date(
      Date.now() + EXPIRE_MINUTES * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabase
      .from("sms_login_codes")
      .insert({
        phone: normalized.e164,
        code_hash: hashSmsCode(normalized.e164, code),
        expires_at: expiresAt,
      });

    if (insertError) throw insertError;

    if (hasTencentSmsConfig()) {
      await sendTencentSmsCode(normalized.e164, code);
    }

    return NextResponse.json({
      success: true,
      phone: maskPhone(normalized.e164),
      expiresAt,
      testMode: !hasTencentSmsConfig(),
    });
  } catch (error) {
    console.error("Send SMS code failed:", error);
    return NextResponse.json(
      { error: getDatabaseSetupMessage(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const { phone, code } = await req.json();
    const normalized = normalizeChinaPhone(phone || "");

    if (!/^\d{6}$/.test(code || "")) {
      return NextResponse.json({ error: "验证码格式错误" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("sms_login_codes")
      .update({ used_at: now })
      .eq("phone", normalized.e164)
      .eq("code_hash", hashSmsCode(normalized.e164, code))
      .is("used_at", null)
      .gt("expires_at", now)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "验证码错误或已过期" },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      userId: `phone:${normalized.e164}`,
      name: maskPhone(normalized.e164),
    });
    const isHttps = new URL(req.url).protocol === "https:";

    response.cookies.set("zishoo_user_id", `phone:${normalized.e164}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set("zishoo_user_name", encodeURIComponent(maskPhone(normalized.e164)), {
      httpOnly: false,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Verify SMS code failed:", error);
    return NextResponse.json(
      { error: getDatabaseSetupMessage(error) },
      { status: 500 }
    );
  }
}
