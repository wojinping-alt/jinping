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

async function getSignedVideoUrl(req: Request) {
  const { searchParams } = new URL(req.url);
  const item = getMiniProgramVideoAd(searchParams.get("key"));

  if (!item) {
    return null;
  }

  const signed = await signVodUrl(item.videoUrl, `mini-video-ad:${item.key}`);
  return signed.url;
}

function copyVideoHeaders(upstream: Response) {
  const headers = new Headers();
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "no-store");
  return headers;
}

export async function HEAD(req: Request) {
  const signedUrl = await getSignedVideoUrl(req);

  if (!signedUrl) {
    return new Response(null, { status: 404 });
  }

  const upstream = await fetch(signedUrl, {
    method: "HEAD",
    cache: "no-store",
  });

  return new Response(null, {
    status: upstream.status,
    headers: copyVideoHeaders(upstream),
  });
}

export async function GET(req: Request) {
  const signedUrl = await getSignedVideoUrl(req);

  if (!signedUrl) {
    return NextResponse.json({ error: "视频不存在" }, { status: 404 });
  }

  const range = req.headers.get("range");
  const upstream = await fetch(signedUrl, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `视频源不可用：${upstream.status}` },
      { status: upstream.status }
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: copyVideoHeaders(upstream),
  });
}
