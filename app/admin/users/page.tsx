import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type SearchParams = Promise<{ segment?: string }>;

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
  ownedItems: Set<string>;
  latestOrderAt: string;
  firstSeenAt: string;
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

function isToday(value: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
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
    ownedItems: new Set(),
    latestOrderAt: "",
    firstSeenAt: "",
  };
  users.set(userId, user);
  return user;
}

function rememberOrderTime(user: UserSummary, value: string | null) {
  if (!value) return;
  if (!user.latestOrderAt || value > user.latestOrderAt) {
    user.latestOrderAt = value;
  }
  if (!user.firstSeenAt || value < user.firstSeenAt) {
    user.firstSeenAt = value;
  }
}

function hasAccess(user: UserSummary) {
  return user.ownedItems.size > 0;
}

export default async function AdminUsersPage({ searchParams }: { searchParams?: SearchParams }) {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const params = (await searchParams) || {};
  const activeSegment = params.segment || "all";
  const supabase = createAdminClient();
  const [coursesResult, accessResult, courseOrdersResult, productOrdersResult] = await Promise.all([
    safeTable<CourseRow>(() => supabase.from("courses").select("id,title").returns<CourseRow[]>()),
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
    const user = getUser(users, String(access.user_id), "课程权限");
    if (access.course_id) {
      user.ownedItems.add(courseTitleById.get(String(access.course_id)) || `课程 ${access.course_id}`);
    }
  }

  for (const order of courseOrdersResult.data) {
    if (!order.user_id) continue;
    const user = getUser(users, String(order.user_id), "课程订单");
    user.orderCount += 1;
    rememberOrderTime(user, order.created_at);

    if (order.status === "paid") {
      user.paidOrderCount += 1;
      user.paidAmount += Number(order.amount || 0);
      if (order.course_id) {
        user.ownedItems.add(courseTitleById.get(String(order.course_id)) || `课程 ${order.course_id}`);
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
    rememberOrderTime(user, order.created_at);

    if (order.status === "paid") {
      user.paidOrderCount += 1;
      user.paidAmount += Number(order.amount || 0);
      if (order.product_title) {
        user.ownedItems.add(order.product_title);
      }
    }

    if (order.status === "pending") {
      user.pendingOrderCount += 1;
    }
  }

  const allUserRows = Array.from(users.values()).sort((a, b) =>
    String(b.latestOrderAt || "").localeCompare(String(a.latestOrderAt || ""))
  );
  const accessUsers = allUserRows.filter(hasAccess);
  const noAccessUsers = allUserRows.filter((user) => !hasAccess(user));
  const paidUsers = allUserRows.filter((user) => user.paidOrderCount > 0);
  const todayNewUsers = allUserRows.filter((user) => isToday(user.firstSeenAt));
  const todayPaidUsers = allUserRows.filter((user) => isToday(user.latestOrderAt) && user.paidOrderCount > 0);
  const activeUserRows =
    activeSegment === "access" ? accessUsers : activeSegment === "no-access" ? noAccessUsers : allUserRows;
  const errors = [coursesResult, accessResult, courseOrdersResult, productOrdersResult]
    .map((result) => result.error)
    .filter(Boolean);

  const segments = [
    { key: "all", label: "全部用户", count: allUserRows.length, href: "/admin/users" },
    { key: "access", label: "有购买权限", count: accessUsers.length, href: "/admin/users?segment=access" },
    { key: "no-access", label: "无购买权限", count: noAccessUsers.length, href: "/admin/users?segment=no-access" },
  ];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link className="text-sm font-semibold text-blue-700" href="/admin">
              ← 返回后台首页
            </Link>
            <h1 className="mt-2 text-2xl font-bold">用户数据</h1>
            <p className="mt-1 text-sm text-slate-500">
              区分全部用户、有购买权限用户和无购买权限用户，方便判断购买转化。
            </p>
          </div>
          <div className="rounded-lg bg-white px-5 py-3 text-right shadow-sm">
            <p className="text-sm text-slate-500">累计用户</p>
            <p className="text-3xl font-bold">{allUserRows.length}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {errors.length ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            部分数据读取失败：{errors.join("；")}
          </div>
        ) : null}

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">实时用户</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-6">
            <Metric label="累计用户" value={allUserRows.length} />
            <Metric label="今日新增用户" value={todayNewUsers.length} />
            <Metric label="累计付费用户" value={paidUsers.length} />
            <Metric label="今日付费用户" value={todayPaidUsers.length} />
            <Metric label="有购买权限用户" value={accessUsers.length} />
            <Metric label="无购买权限用户" value={noAccessUsers.length} />
          </div>
        </section>

        <section className="mt-5 rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">重点运营人群</h2>
            <p className="text-sm text-slate-400">后续可继续接入访问记录、标签和消息触达</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <AudienceCard
              title="有购买权限用户"
              count={accessUsers.length}
              desc="已经付款或被后台授权，可观看对应课程。"
              href="/admin/users?segment=access"
            />
            <AudienceCard
              title="无购买权限用户"
              count={noAccessUsers.length}
              desc="来过或下过单，但当前没有已解锁课程。"
              href="/admin/users?segment=no-access"
            />
            <AudienceCard
              title="待付款用户"
              count={allUserRows.filter((user) => user.pendingOrderCount > 0 && user.paidOrderCount === 0).length}
              desc="有待付款订单，适合后续提醒转化。"
              href="/admin/orders?status=pending"
            />
            <AudienceCard
              title="已付费用户"
              count={paidUsers.length}
              desc={`累计消费 ${money(allUserRows.reduce((sum, user) => sum + user.paidAmount, 0))}`}
              href="/admin/orders?status=paid"
            />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-xl font-bold">用户列表</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {segments.map((segment) => (
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeSegment === segment.key
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  href={segment.href}
                  key={segment.key}
                >
                  {segment.label}（{segment.count}）
                </Link>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">用户</th>
                  <th className="px-4 py-3">用户状态</th>
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
                {activeUserRows.map((user) => (
                  <tr className="border-t border-slate-100 align-top" key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{maskUserId(user.id)}</p>
                      <p className="mt-1 max-w-[260px] break-all text-xs text-slate-400">{user.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      {hasAccess(user) ? (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          有购买权限
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                          无购买权限
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{Array.from(user.source).join("、")}</td>
                    <td className="px-4 py-3">{user.orderCount}</td>
                    <td className="px-4 py-3">{user.paidOrderCount}</td>
                    <td className="px-4 py-3">{user.pendingOrderCount}</td>
                    <td className="px-4 py-3 font-semibold text-orange-600">{money(user.paidAmount)}</td>
                    <td className="px-4 py-3">
                      {user.ownedItems.size ? (
                        <div className="max-w-[280px] space-y-1">
                          {Array.from(user.ownedItems)
                            .slice(0, 4)
                            .map((item) => (
                              <p className="truncate text-slate-600" key={item}>
                                {item}
                              </p>
                            ))}
                          {user.ownedItems.size > 4 ? (
                            <p className="text-xs text-slate-400">还有 {user.ownedItems.size - 4} 项</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-400">暂无</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatTime(user.latestOrderAt)}</td>
                  </tr>
                ))}
                {!activeUserRows.length ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={9}>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function AudienceCard({
  title,
  count,
  desc,
  href,
}: {
  title: string;
  count: number;
  desc: string;
  href: string;
}) {
  return (
    <Link className="rounded-lg border border-slate-100 bg-slate-50 p-4 transition hover:bg-blue-50" href={href}>
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-3 text-3xl font-bold">{count}</p>
      <p className="mt-2 text-sm text-slate-500">{desc}</p>
    </Link>
  );
}
