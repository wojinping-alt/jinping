"use client";

import { useMemo, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";

export type Episode = {
  id?: number;
  episode_number: number;
  title: string;
  video_url?: string | null;
};

export default function EpisodePlayer({
  courseId,
  episodes,
  fallbackVideoUrl,
  unlocked,
}: {
  courseId: string;
  episodes: Episode[];
  fallbackVideoUrl?: string | null;
  unlocked: boolean;
}) {
  const playableEpisodes = useMemo(() => {
    if (episodes.length > 0) return episodes;
    if (!fallbackVideoUrl) return [];
    return [
      {
        episode_number: 1,
        title: "第 1 集",
        video_url: fallbackVideoUrl,
      },
    ];
  }, [episodes, fallbackVideoUrl]);

  const [activeNumber, setActiveNumber] = useState(
    playableEpisodes[0]?.episode_number ?? 1
  );
  const activeEpisode =
    playableEpisodes.find((episode) => episode.episode_number === activeNumber) ||
    playableEpisodes[0];

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
        {unlocked && activeEpisode?.video_url ? (
          <VideoPlayer
            src={activeEpisode.video_url}
            courseId={courseId}
            unlocked
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
            请先购买课程，购买后这里会显示完整视频播放器。
          </div>
        )}

        {unlocked && activeEpisode?.video_url && (
          <a
            href={activeEpisode.video_url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            打开当前集视频链接
          </a>
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
