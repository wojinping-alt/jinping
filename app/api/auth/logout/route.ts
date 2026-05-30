import { NextResponse } from "next/server";

function getCookieDomain(req: Request) {
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || "";
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(":")[0];
  const host =
    forwardedHost ||
    req.headers.get("host")?.split(":")[0] ||
    new URL(req.url).hostname;

  return configuredSite.includes("zishoo.cn") || host.endsWith("zishoo.cn")
    ? ".zishoo.cn"
    : undefined;
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
