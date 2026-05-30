import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const response = NextResponse.json({ success: true });
  const isHttps = new URL(req.url).protocol === "https:";

  for (const name of [
    "zishoo_user_id",
    "zishoo_user_name",
    "zishoo_wechat_openid",
  ]) {
    response.cookies.set(name, "", {
      httpOnly: name !== "zishoo_user_name",
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

