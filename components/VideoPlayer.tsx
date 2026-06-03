"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function VideoPlayer({
  src,
  unlocked = false,
  previewSeconds = 10,
}: {
  src: string;
  courseId?: number | string;
  unlocked?: boolean;
  previewSeconds?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const alertedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!src.includes(".m3u8")) {
      video.src = src;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    if (!Hls.isSupported()) {
      video.src = src;
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });

    hls.loadSource(src);
    hls.attachMedia(video);

    return () => hls.destroy();
  }, [src]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video || unlocked) return;

    if (video.currentTime >= previewSeconds) {
      video.currentTime = previewSeconds;
      video.pause();

      if (!alertedRef.current) {
        alertedRef.current = true;
        alert("请购买课程后继续观看");
      }
    }
  }

  return (
    <video
      ref={videoRef}
      controls
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      disableRemotePlayback
      playsInline
      onTimeUpdate={handleTimeUpdate}
      onContextMenu={(event) => event.preventDefault()}
      className="w-full rounded-lg bg-black"
    />
  );
}
