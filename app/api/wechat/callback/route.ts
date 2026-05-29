import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/login`
      );
    }

    const appid = process.env.WECHAT_APP_ID!;
    const secret = process.env.WECHAT_APP_SECRET!;

    // 1️⃣ 用 code 换 token
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appid}&secret=${secret}&code=${code}&grant_type=authorization_code`
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/login`
      );
    }

    // 2️⃣ 获取用户信息
    const userRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`
    );

    const user = await userRes.json();

    console.log("微信用户：", user);

    // 3️⃣ 写入 cookie（最简单登录态）
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}`
    );

    response.cookies.set(
      "wechat_user",
      JSON.stringify(user),
      {
        httpOnly: false,
        path: "/",
      }
    );

    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      success: false,
      error: "微信登录失败",
    });
  }
}