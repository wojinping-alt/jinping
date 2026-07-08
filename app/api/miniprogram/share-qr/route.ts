import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path || !path.startsWith("/pages/")) {
    return NextResponse.json({ error: "缺少有效分享路径" }, { status: 400 });
  }

  const appid = process.env.WECHAT_MINI_APP_ID || "";
  const payload = appid ? `weixin://dl/business/?appid=${appid}&path=${encodeURIComponent(path)}` : path;
  const dataUrl = await QRCode.toDataURL(payload, {
    width: 420,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  } as Parameters<typeof QRCode.toDataURL>[1] & { errorCorrectionLevel: string });
  const png = Buffer.from(dataUrl.split(",")[1] || "", "base64");

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
