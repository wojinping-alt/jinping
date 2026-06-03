"use client";

import { useEffect, useMemo, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";

export type Episode = {
  id?: number;
  episode_number: number;
  title: string;
};

type PlayInfo = {
  playUrl: string;
  expiresAt: number;
  signed: boolean;
  watermark: string;
};

export default function EpisodePlayer({
  courseId,
  episodes,
  unlocked,
}: {
  courseId: string;
  episodes: Episode[];
  fallbackVideoUrl?: string | null;
  unlocked: boolean;
}) {
  const playableEpisodes = useMemo(() => {
    if (episodes.length > 0) return episodes;
    return [
      {
        episode_number: 1,
        title: "第 1 集",
      },
    ];
  }, [episodes]);

  const [activeNumber, setActiveNumber] = useState(
    playableEpisodes[0]?.episode_number ?? 1
  );
  const [playInfo, setPlayInfo] = useState<PlayInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeEpisode =
    playableEpisodes.find((episode) => episode.episode_number === activeNumber) ||
    playableEpisodes[0];

  useEffect(() => {
    if (!unlocked || !activeEpisode) {
      return;
    }

    const controller = new AbortController();

    async function loadPlayUrl() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ courseId });

        if (activeEpisode.id) {
          params.set("episodeId", String(activeEpisode.id));
        }

        const res = await fetch(`/api/video/play?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "视频播放地址获取失败");
        }

        setPlayInfo(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setPlayInfo(null);
        setError(err instanceof Error ? err.message : "视频播放地址获取失败");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPlayUrl();

    return () => controller.abort();
  }, [activeEpisode, courseId, unlocked]);

  if (playableEpisodes.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
        这个合集还没有导入视频目录。
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0">
        {unlocked ? (
          <div className="relative overflow-hidden rounded-lg bg-black">
            {playInfo?.playUrl ? (
              <VideoPlayer
                key={playInfo.playUrl}
                src={playInfo.playUrl}
                courseId={courseId}
                unlocked
              />
            ) : (
              <div className="flex aspect-video items-center justify-center p-6 text-center text-white">
                {loading ? "正在获取安全播放地址..." : error || "视频暂时无法播放"}
              </div>
            )}
            {playInfo?.watermark && (
              <div className="pointer-events-none absolute inset-0 z-10">
                <div className="absolute left-4 top-4 rounded bg-black/35 px-3 py-1 text-xs font-medium text-white/80">
                  {playInfo.watermark}
                </div>
                <div className="absolute bottom-5 right-5 rotate-[-18deg] text-sm font-semibold text-white/25">
                  {playInfo.watermark}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
            请先购买课程，购买后这里会显示完整视频播放器。
          </div>
        )}
      </section>

      <aside className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold text-gray-900">课程目录</h2>
          <p className="mt-1 text-sm text-gray-500">
            共 {playableEpisodes.length} 集
          </p>
        </div>

        <div className="max-h-[620px] overflow-auto p-2">
          {playableEpisodes.map((episode) => {
            const active = episode.episode_number === activeNumber;

            return (
              <button
                key={`${episode.episode_number}-${episode.title}`}
                type="button"
                onClick={() => setActiveNumber(episode.episode_number)}
                className={`mb-2 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition ${
                  active
                    ? "bg-orange-100 text-orange-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-700 ring-1 ring-gray-200">
                  {episode.episode_number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {episode.title}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {unlocked ? "已解锁" : "购买后观看"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
