import { NextResponse } from "next/server";

export async function GET() {
  const appid = "wxaabb8e5561161ecb";

  const redirect_uri = encodeURIComponent(
    "https://www.zishoo.cn/api/wechat/callback"
  );

  const url =
    `https://open.weixin.qq.com/connect/oauth2/authorize` +
    `?appid=${appid}` +
    `&redirect_uri=${redirect_uri}` +
    `&response_type=code` +
    `&scope=snsapi_userinfo` +
    `&state=123` +
    `#wechat_redirect`;

  return NextResponse.redirect(url);
}