import { NextResponse } from "next/server";
import { signMiniProgramSession } from "@/lib/miniprogram-auth";

type WechatCodeResponse = {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
};

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "缺少微信登录 code" }, { status: 400 });
    }

    const appid = process.env.WECHAT_MINI_APP_ID || process.env.WECHAT_PAY_APPID;
    const secret = process.env.WECHAT_MINI_APP_SECRET;

    if (!appid || !secret) {
      return NextResponse.json(
        { error: "缺少小程序配置：WECHAT_MINI_APP_ID / WECHAT_MINI_APP_SECRET" },
        { status: 500 }
      );
    }

    const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
    url.searchParams.set("appid", appid);
    url.searchParams.set("secret", secret);
    url.searchParams.set("js_code", code);
    url.searchParams.set("grant_type", "authorization_code");

    const res = await fetch(url);
    const data = (await res.json()) as WechatCodeResponse;

    if (!res.ok || !data.openid) {
      return NextResponse.json(
        { error: data.errmsg || "微信登录失败", code: data.errcode },
        { status: 400 }
      );
    }

    const token = signMiniProgramSession({
      openid: data.openid,
      sessionKey: data.session_key,
    });

    return NextResponse.json({
      token,
      openid: data.openid,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "小程序登录失败" },
      { status: 500 }
    );
  }
}
