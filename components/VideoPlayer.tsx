"use client";

import { useRef } from "react";

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
      onTimeUpdate={handleTimeUpdate}
      className="mt-6 w-full rounded-2xl"
      src={src}
    />
  );
}

