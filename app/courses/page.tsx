import Link from "next/link";

const courses = [
  {
    id: "1",
    title: "基础汉字入门",
    desc: "学习最基础的汉字结构",
  },
  {
    id: "2",
    title: "进阶汉字结构",
    desc: "掌握偏旁部首规律",
  },
];

export default function CoursesPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>课程列表</h1>

      <div style={{ marginTop: 20 }}>
        {courses.map((course) => (
          <div
            key={course.id}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              marginBottom: 10,
              borderRadius: 8,
            }}
          >
            <h2>{course.title}</h2>
            <p>{course.desc}</p>

            <Link href={`/lesson/${course.id}`}>
              进入课程 →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}