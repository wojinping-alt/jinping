import { NextResponse } from "next/server";

function getCookieDomain(req: Request) {
  const host = req.headers.get("host")?.split(":")[0];
  return host?.endsWith("zishoo.cn") ? ".zishoo.cn" : undefined;
}

export async function POST(req: Request) {
  const response = NextResponse.json({ success: true });
  const isHttps = new URL(req.url).protocol === "https:";
  const domain = getCookieDomain(req);

  for (const name of [
    "zishoo_user_id",
    "zishoo_user_id_client",
    "zishoo_user_name",
    "zishoo_wechat_openid",
  ]) {
    response.cookies.set(name, "", {
      httpOnly: name !== "zishoo_user_name",
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 0,
      domain,
    });
  }

  return response;
}
