import { supabase } from "@/lib/supabase";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (!course) {
    return <div>课程不存在</div>;
  }

  return (
    <div className="min-h-screen bg-orange-50 p-6">
      <h1 className="text-4xl font-bold text-orange-600">
        {course.title}
      </h1>

      <p className="mt-4 text-gray-700">
        {course.description}
      </p>

      <p className="mt-4 text-2xl text-red-500">
        ¥{course.price}
      </p>

      <video
        controls
        className="mt-6 w-full rounded-2xl"
        src={course.video_url}
      />

      {course.is_free_preview && (
        <p className="mt-4 text-green-600">
          当前课程支持试看
        </p>
      )}
    </div>
  );
}