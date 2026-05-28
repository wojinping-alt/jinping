"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  useEffect(() => {
    async function loadCourses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);

        return;
      }

      setIsLoggedIn(true);

      const { data: userCourses } =
        await supabase
          .from("user_courses")
          .select("course_id")
          .eq("user_id", user.id);

      const courseIds =
        userCourses?.map(
          (item) => item.course_id
        ) || [];

      if (courseIds.length === 0) {
        setLoading(false);

        return;
      }

      const { data: coursesData } =
        await supabase
          .from("courses")
          .select("*")
          .in("id", courseIds);

      setCourses(coursesData || []);

      setLoading(false);
    }

    loadCourses();
  }, []);

  if (loading) {
    return (
      <div className="p-10">
        加载中...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="p-10">
        请先登录
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <h1 className="text-4xl font-bold text-orange-600 mb-6">
        我的课程
      </h1>

      {courses.length === 0 && (
        <p>你还没有购买课程</p>
      )}

      <div className="space-y-6">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/lesson/${course.id}`}
            className="block rounded-2xl bg-white p-6 shadow"
          >
            <h2 className="text-2xl font-bold">
              {course.title}
            </h2>

            <p className="mt-2 text-gray-600">
              {course.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}