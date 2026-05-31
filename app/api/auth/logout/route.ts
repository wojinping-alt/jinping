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
    : "";
}

function expiredCookie(name: string, options?: { domain?: string; httpOnly?: boolean }) {
  const parts = [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Lax",
    "Secure",
  ];

  if (options?.domain) parts.push(`Domain=${options.domain}`);
  if (options?.httpOnly) parts.push("HttpOnly");

  return parts.join("; ");
}

export async function POST(req: Request) {
  const response = NextResponse.json({ success: true });
  const sharedDomain = getCookieDomain(req);
  const names = [
    "zishoo_user_id",
    "zishoo_user_id_client",
    "zishoo_user_name",
    "zishoo_wechat_openid",
  ];

  for (const name of names) {
    const httpOnly = name !== "zishoo_user_name" && name !== "zishoo_user_id_client";

    response.headers.append("Set-Cookie", expiredCookie(name, { httpOnly }));

    if (sharedDomain) {
      response.headers.append(
        "Set-Cookie",
        expiredCookie(name, { domain: sharedDomain, httpOnly })
      );
    }
  }

  return response;
}
