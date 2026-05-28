"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VideoPlayer({
  src,
  courseId,
}: {
  src: string;
  courseId: number;
}) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const alertedRef = useRef(false);

  const [isUnlocked, setIsUnlocked] =
    useState(false);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("user_courses")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .single();

      if (data) {
        setIsUnlocked(true);
      }
    }

    checkAccess();
  }, [courseId]);

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video) return;

    if (
      !isUnlocked &&
      video.currentTime >= 10
    ) {
      video.currentTime = 10;

      video.pause();

      if (!alertedRef.current) {
        alertedRef.current = true;

        alert(
          "请购买课程后继续观看"
        );
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