import { NextResponse, type NextRequest } from "next/server";

const CANONICAL_HOST = "www.zishoo.cn";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";

  if (host === "zishoo.cn") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;

    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
