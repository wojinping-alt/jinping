import { NextResponse } from "next/server";
import { MINI_PROGRAM_VIDEO_ADS } from "@/lib/miniprogram-video-ads";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;

  const ads = MINI_PROGRAM_VIDEO_ADS.map((item) => ({
    key: item.key,
    title: item.title,
    image: item.image,
    videoUrl: `${origin}/api/miniprogram/video-ads/stream?key=${encodeURIComponent(item.key)}`,
  }));

  return NextResponse.json(
    { ads },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
