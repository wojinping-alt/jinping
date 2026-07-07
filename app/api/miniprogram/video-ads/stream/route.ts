import { NextResponse } from "next/server";
import { getMiniProgramVideoAd } from "@/lib/miniprogram-video-ads";
import { signVodUrl } from "@/lib/video-security";

const PASS_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const item = getMiniProgramVideoAd(searchParams.get("key"));

  if (!item) {
    return NextResponse.json({ error: "视频不存在" }, { status: 404 });
  }

  const signed = await signVodUrl(item.videoUrl, `mini-video-ad:${item.key}`);
  const range = req.headers.get("range");
  const upstream = await fetch(signed.url, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `视频源不可用：${upstream.status}` },
      { status: upstream.status }
    );
  }

  const headers = new Headers();
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
