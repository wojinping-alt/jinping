import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type CourseRow = {
  id: string | number;
  title: string;
};

type CourseAccessRow = {
  user_id: string | null;
  course_id: string | number | null;
};

type CourseOrderRow = {
  id: string | number;
  user_id: string | null;
  course_id: string | number | null;
  amount: number | string | null;
  status: string | null;
  created_at: string | null;
  paid_at?: string | null;
};

type ProductOrderRow = {
  id: string | number;
  user_id: string | null;
  product_title: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string | null;
  paid_at?: string | null;
};

type UserSummary = {
  id: string;
  source: Set<string>;
  paidAmount: number;
  orderCount: number;
  paidOrderCount: number;
  pendingOrderCount: number;
  ownedCourses: Set<string>;
  latestOrderAt: string;
};

async function safeTable<T>(
  loader: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  try {
    const { data, error } = await Promise.resolve(loader());
    return { data: data || [], error: error?.message || "" };
  } catch (error) {
    return {
      data: [] as T[],
      error: error instanceof Error ? error.message : "读取失败",
    };
  }
}

function money(value: number) {
  return `¥ ${value.toFixed(2)}`;
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function maskUserId(id: string) {
  if (id.length <= 18) return id;
  return `${id.slice(0, 8)}...${id.slice(-8)}`;
}

function getUser(users: Map<string, UserSummary>, userId: string, source: string) {
  const existing = users.get(userId);
  if (existing) {
    existing.source.add(source);
    return existing;
  }

  const user: UserSummary = {
    id: userId,
    source: new Set([source]),
    paidAmount: 0,
    orderCount: 0,
    paidOrderCount: 0,
    pendingOrderCount: 0,
    ownedCourses: new Set(),
    latestOrderAt: "",
  };
  users.set(userId, user);
  return user;
}

function rememberLatest(user: UserSummary, value: string | null) {
  if (!value) return;
  if (!user.latestOrderAt || value > user.latestOrderAt) {
    user.latestOrderAt = value;
  }
}

export default async function AdminUsersPage() {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const supabase = createAdminClient();
  const [coursesResult, accessResult, courseOrdersResult, productOrdersResult] = await Promise.all([
    safeTable<CourseRow>(() =>
      supabase.from("courses").select("id,title").returns<CourseRow[]>()
    ),
    safeTable<CourseAccessRow>(() =>
      supabase.from("user_courses").select("user_id,course_id").returns<CourseAccessRow[]>()
    ),
    safeTable<CourseOrderRow>(() =>
      supabase
        .from("orders")
        .select("id,user_id,course_id,amount,status,created_at,paid_at")
        .order("created_at", { ascending: false })
        .limit(1000)
        .returns<CourseOrderRow[]>()
    ),
    safeTable<ProductOrderRow>(() =>
      supabase
        .from("product_orders")
        .select("id,user_id,product_title,amount,status,created_at,paid_at")
        .order("created_at", { ascending: false })
        .limit(1000)
        .returns<ProductOrderRow[]>()
    ),
  ]);

  const courseTitleById = new Map(coursesResult.data.map((course) => [String(course.id), course.title]));
  const users = new Map<string, UserSummary>();

  for (const access of accessResult.data) {
    if (!access.user_id) continue;
    const user = getUser(users, String(access.user_id), "已购权限");
    if (access.course_id) {
      user.ownedCourses.add(courseTitleById.get(String(access.course_id)) || `课程 ${access.course_id}`);
    }
  }

  for (const order of courseOrdersResult.data) {
    if (!order.user_id) continue;
    const user = getUser(users, String(order.user_id), "课程订单");
    user.orderCount += 1;
    rememberLatest(user, order.created_at);

    if (order.status === "paid") {
      user.paidOrderCount += 1;
      user.paidAmount += Number(order.amount || 0);
      if (order.course_id) {
        user.ownedCourses.add(courseTitleById.get(String(order.course_id)) || `课程 ${order.course_id}`);
      }
    }

    if (order.status === "pending") {
      user.pendingOrderCount += 1;
    }
  }

  for (const order of productOrdersResult.data) {
    if (!order.user_id) continue;
    const user = getUser(users, String(order.user_id), "商品订单");
    user.orderCount += 1;
    rememberLatest(user, order.created_at);

    if (order.status === "paid") {
      user.paidOrderCount += 1;
      user.paidAmount += Number(order.amount || 0);
      if (order.product_title) {
        user.ownedCourses.add(order.product_title);
      }
    }

    if (order.status === "pending") {
      user.pendingOrderCount += 1;
    }
  }

  const userRows = Array.from(users.values()).sort((a, b) =>
    String(b.latestOrderAt || "").localeCompare(String(a.latestOrderAt || ""))
  );
  const errors = [coursesResult, accessResult, courseOrdersResult, productOrdersResult]
    .map((result) => result.error)
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link className="text-sm font-semibold text-blue-700" href="/admin">
              ← 返回后台首页
            </Link>
            <h1 className="mt-2 text-2xl font-bold">累计用户明细</h1>
            <p className="mt-1 text-sm text-slate-500">
              汇总课程权限、课程订单和商品订单里的用户数据。
            </p>
          </div>
          <div className="rounded-lg bg-white px-5 py-3 text-right shadow-sm">
            <p className="text-sm text-slate-500">累计用户</p>
            <p className="text-3xl font-bold">{userRows.length}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {errors.length ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            部分数据读取失败：{errors.join("；")}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">已支付订单</p>
            <p className="mt-2 text-3xl font-bold">
              {userRows.reduce((sum, user) => sum + user.paidOrderCount, 0)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">待付款订单</p>
            <p className="mt-2 text-3xl font-bold">
              {userRows.reduce((sum, user) => sum + user.pendingOrderCount, 0)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">累计消费</p>
            <p className="mt-2 text-3xl font-bold">
              {money(userRows.reduce((sum, user) => sum + user.paidAmount, 0))}
            </p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">有购买权限用户</p>
            <p className="mt-2 text-3xl font-bold">
              {userRows.filter((user) => user.ownedCourses.size > 0).length}
            </p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-xl font-bold">用户列表</h2>
            <p className="mt-1 text-sm text-slate-500">
              目前先展示系统能识别到的 user_id/openid。后续可继续补手机号、昵称、头像、最后访问时间。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">用户</th>
                  <th className="px-4 py-3">来源</th>
                  <th className="px-4 py-3">订单数</th>
                  <th className="px-4 py-3">已支付</th>
                  <th className="px-4 py-3">待付款</th>
                  <th className="px-4 py-3">消费金额</th>
                  <th className="px-4 py-3">已购/权限</th>
                  <th className="px-4 py-3">最近下单</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((user) => (
                  <tr className="border-t border-slate-100 align-top" key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{maskUserId(user.id)}</p>
                      <p className="mt-1 max-w-[260px] break-all text-xs text-slate-400">{user.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{Array.from(user.source).join("、")}</td>
                    <td className="px-4 py-3">{user.orderCount}</td>
                    <td className="px-4 py-3">{user.paidOrderCount}</td>
                    <td className="px-4 py-3">{user.pendingOrderCount}</td>
                    <td className="px-4 py-3 font-semibold text-orange-600">{money(user.paidAmount)}</td>
                    <td className="px-4 py-3">
                      {user.ownedCourses.size ? (
                        <div className="max-w-[280px] space-y-1">
                          {Array.from(user.ownedCourses)
                            .slice(0, 4)
                            .map((course) => (
                              <p className="truncate text-slate-600" key={course}>
                                {course}
                              </p>
                            ))}
                          {user.ownedCourses.size > 4 ? (
                            <p className="text-xs text-slate-400">还有 {user.ownedCourses.size - 4} 项</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">暂无</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatTime(user.latestOrderAt)}</td>
                  </tr>
                ))}
                {!userRows.length ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={8}>
                      暂无用户数据
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
