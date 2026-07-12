import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { logoutAdminAction, updateCourseAction } from "./actions";

type CourseRow = {
  id: string | number;
  title: string;
  description: string | null;
  price: number | string | null;
  cover_url?: string | null;
};

type EpisodeRow = {
  course_id: string | number;
};

type OrderRow = {
  id: string | number;
  user_id: string | null;
  course_id?: string | number | null;
  product_title?: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string | null;
};

type UserCourseRow = {
  user_id: string | null;
  course_id: string | number | null;
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

function formatTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function statusLabel(status: string | null) {
  if (status === "paid") return "已支付";
  if (status === "pending") return "待付款";
  if (status === "closed" || status === "cancelled" || status === "canceled") return "已取消";
  return status || "未知";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const supabase = createAdminClient();

  const [coursesResult, episodesResult, accessResult, courseOrdersResult, productOrdersResult] =
    await Promise.all([
      safeTable<CourseRow>(() =>
        supabase
          .from("courses")
          .select("id,title,description,price,cover_url")
          .order("id", { ascending: true })
          .returns<CourseRow[]>()
      ),
      safeTable<EpisodeRow>(() =>
        supabase.from("course_episodes").select("course_id").returns<EpisodeRow[]>()
      ),
      safeTable<UserCourseRow>(() =>
        supabase.from("user_courses").select("user_id,course_id").returns<UserCourseRow[]>()
      ),
      safeTable<OrderRow>(() =>
        supabase
          .from("orders")
          .select("id,user_id,course_id,amount,status,created_at")
          .order("created_at", { ascending: false })
          .limit(20)
          .returns<OrderRow[]>()
      ),
      safeTable<OrderRow>(() =>
        supabase
          .from("product_orders")
          .select("id,user_id,product_title,amount,status,created_at")
          .order("created_at", { ascending: false })
          .limit(20)
          .returns<OrderRow[]>()
      ),
    ]);

  const courseOrders = courseOrdersResult.data;
  const productOrders = productOrdersResult.data;
  const allOrders = [...courseOrders, ...productOrders].sort((a, b) =>
    String(b.created_at || "").localeCompare(String(a.created_at || ""))
  );
  const paidOrders = allOrders.filter((order) => order.status === "paid");
  const pendingOrders = allOrders.filter((order) => order.status === "pending");
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const userIds = new Set(
    [...accessResult.data, ...allOrders]
      .map((row) => row.user_id)
      .filter(Boolean)
      .map(String)
  );

  const episodeCounts = new Map<string, number>();
  for (const episode of episodesResult.data) {
    const key = String(episode.course_id);
    episodeCounts.set(key, (episodeCounts.get(key) || 0) + 1);
  }

  const subscriberCounts = new Map<string, Set<string>>();
  for (const row of accessResult.data) {
    if (!row.user_id || !row.course_id) continue;
    const key = String(row.course_id);
    const set = subscriberCounts.get(key) || new Set<string>();
    set.add(String(row.user_id));
    subscriberCounts.set(key, set);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-slate-500">Zishoo Admin</p>
            <h1 className="text-2xl font-bold">字书管理后台</h1>
          </div>
          <form action={logoutAdminAction}>
            <button className="rounded-md border border-slate-200 px-4 py-2 text-sm">
              退出后台
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {params?.saved ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            保存成功。
          </div>
        ) : null}
        {params?.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            操作失败：{params.error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">累计支付金额</p>
            <p className="mt-2 text-3xl font-bold">{money(revenue)}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">订单总数</p>
            <p className="mt-2 text-3xl font-bold">{allOrders.length}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">待付款</p>
            <p className="mt-2 text-3xl font-bold">{pendingOrders.length}</p>
          </div>
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">累计用户</p>
            <p className="mt-2 text-3xl font-bold">{userIds.size}</p>
          </div>
        </section>

        <div className="mt-3">
          <Link
            className="inline-flex rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            href="/admin/users"
          >
            查看累计用户明细 →
          </Link>
        </div>

        <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold">课程管理</h2>
              <p className="mt-1 text-sm text-slate-500">
                第一版支持修改课程标题、简介和价格；目录和视频仍从 VOD 数据表读取。
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {coursesResult.data.map((course) => {
              const id = String(course.id);
              return (
                <form
                  action={updateCourseAction}
                  className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-[80px_1fr_1.4fr_120px_100px]"
                  key={id}
                >
                  <input type="hidden" name="id" value={id} />
                  <div>
                    <p className="text-xs text-slate-500">ID</p>
                    <p className="mt-2 font-semibold">{id}</p>
                  </div>
                  <label className="text-sm">
                    标题
                    <input
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                      name="title"
                      defaultValue={course.title}
                    />
                  </label>
                  <label className="text-sm">
                    简介
                    <input
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                      name="description"
                      defaultValue={course.description || ""}
                    />
                  </label>
                  <label className="text-sm">
                    价格
                    <input
                      className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={Number(course.price || 0)}
                    />
                  </label>
                  <div className="flex items-end">
                    <button className="w-full rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white">
                      保存
                    </button>
                  </div>
                  <div className="lg:col-span-5 text-xs text-slate-500">
                    共 {episodeCounts.get(id) || 0} 集，{subscriberCounts.get(id)?.size || 0} 人订阅
                  </div>
                </form>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">最近订单</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2">类型</th>
                    <th className="px-3 py-2">金额</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {allOrders.slice(0, 12).map((order) => (
                    <tr className="border-t border-slate-100" key={`${order.product_title ? "p" : "c"}-${order.id}`}>
                      <td className="px-3 py-2">
                        {order.product_title ? order.product_title : `课程 ${order.course_id || ""}`}
                      </td>
                      <td className="px-3 py-2">{money(Number(order.amount || 0))}</td>
                      <td className="px-3 py-2">{statusLabel(order.status)}</td>
                      <td className="px-3 py-2 text-slate-500">{formatTime(order.created_at)}</td>
                    </tr>
                  ))}
                  {!allOrders.length ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-slate-500" colSpan={4}>
                        暂无订单
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold">后台下一步</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p>1. 商品管理目前先展示订单，商品价格仍在代码配置里，下一步建议迁移到数据库。</p>
              <p>2. 评价现在主要在小程序本地存储，后续要建评价表，后台才能真正审核和删除。</p>
              <p>3. 首页 banner、视频轮播、客服二维码建议做成配置表，后台可直接修改。</p>
              <p>4. 用户管理可以继续补：按手机号/openid 搜索、查看已购、手动补课权限。</p>
            </div>

            <div className="mt-5 rounded-md bg-slate-50 p-4 text-xs text-slate-500">
              数据读取错误：
              {[coursesResult, episodesResult, accessResult, courseOrdersResult, productOrdersResult]
                .map((result) => result.error)
                .filter(Boolean)
                .join("；") || "无"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
