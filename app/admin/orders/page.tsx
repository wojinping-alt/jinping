import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type SearchParams = Promise<{ status?: string; keyword?: string }>;

type CourseRow = {
  id: string | number;
  title: string;
  description?: string | null;
};

type CourseOrderRow = {
  id: string | number;
  user_id: string | null;
  course_id: string | number | null;
  out_trade_no?: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string | null;
  paid_at?: string | null;
};

type ProductOrderRow = {
  id: string | number;
  user_id: string | null;
  product_title: string | null;
  product_type?: string | null;
  quantity?: number | string | null;
  out_trade_no?: string | null;
  amount: number | string | null;
  status: string | null;
  created_at: string | null;
  paid_at?: string | null;
};

type AdminOrder = {
  id: string;
  rawId: string;
  type: "course" | "product";
  title: string;
  subtitle: string;
  cover: string;
  userId: string;
  amount: number;
  quantity: number;
  status: string;
  statusText: string;
  createdAt: string;
  paidAt: string;
  outTradeNo: string;
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
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("zh-CN", { hour12: false });
}

function statusInfo(status: string | null) {
  if (status === "paid") return { key: "paid", text: "交易完成", className: "text-blue-600" };
  if (status === "pending") return { key: "pending", text: "待付款", className: "text-orange-600" };
  if (status === "refund" || status === "refunded") {
    return { key: "refund", text: "退款/售后", className: "text-purple-600" };
  }
  if (status === "closed" || status === "cancelled" || status === "canceled") {
    return { key: "closed", text: "交易关闭", className: "text-slate-500" };
  }
  return { key: status || "unknown", text: status || "未知", className: "text-slate-500" };
}

function courseCover(title: string) {
  if (title.includes("Q2") || title.includes("第2")) return "/assets/xet/q2-cover.jpg";
  if (title.includes("Q1") || title.includes("第1")) return "/assets/xet/q1-cover.jpg";
  return "/assets/xet/goods-pack.jpg";
}

function productCover(title: string) {
  if (title.includes("图形纹样") || title.includes("纹样")) return "/assets/xet/playearn-product.jpg";
  return "/assets/xet/goods-pack.jpg";
}

function maskUserId(id: string) {
  if (!id) return "--";
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-8)}`;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams?: SearchParams }) {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const params = (await searchParams) || {};
  const activeStatus = params.status || "all";
  const keyword = (params.keyword || "").trim().toLowerCase();
  const supabase = createAdminClient();

  const [coursesResult, courseOrdersResult, productOrdersResult] = await Promise.all([
    safeTable<CourseRow>(() => supabase.from("courses").select("id,title,description").returns<CourseRow[]>()),
    safeTable<CourseOrderRow>(() =>
      supabase
        .from("orders")
        .select("id,user_id,course_id,out_trade_no,amount,status,created_at,paid_at")
        .order("created_at", { ascending: false })
        .limit(1000)
        .returns<CourseOrderRow[]>()
    ),
    safeTable<ProductOrderRow>(() =>
      supabase
        .from("product_orders")
        .select("id,user_id,product_title,product_type,quantity,out_trade_no,amount,status,created_at,paid_at")
        .order("created_at", { ascending: false })
        .limit(1000)
        .returns<ProductOrderRow[]>()
    ),
  ]);

  const courseById = new Map(coursesResult.data.map((course) => [String(course.id), course]));
  const courseOrders: AdminOrder[] = courseOrdersResult.data.map((order) => {
    const course = order.course_id ? courseById.get(String(order.course_id)) : null;
    const title = course?.title || `课程 ${order.course_id || ""}`;
    const status = statusInfo(order.status);
    return {
      id: `course-${order.id}`,
      rawId: String(order.id),
      type: "course",
      title,
      subtitle: course?.description || "文字的 文化的 艺术的 一课三得",
      cover: courseCover(title),
      userId: order.user_id || "",
      amount: Number(order.amount || 0),
      quantity: 1,
      status: status.key,
      statusText: status.text,
      createdAt: order.created_at || "",
      paidAt: order.paid_at || "",
      outTradeNo: order.out_trade_no || "",
    };
  });

  const productOrders: AdminOrder[] = productOrdersResult.data.map((order) => {
    const title = order.product_title || "字书服务商品";
    const status = statusInfo(order.status);
    return {
      id: `product-${order.id}`,
      rawId: String(order.id),
      type: "product",
      title,
      subtitle: order.product_type ? `类型：${order.product_type}` : "服务类商品",
      cover: productCover(title),
      userId: order.user_id || "",
      amount: Number(order.amount || 0),
      quantity: Number(order.quantity || 1),
      status: status.key,
      statusText: status.text,
      createdAt: order.created_at || "",
      paidAt: order.paid_at || "",
      outTradeNo: order.out_trade_no || "",
    };
  });

  const allOrders = [...courseOrders, ...productOrders].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
  const filteredOrders = allOrders.filter((order) => {
    const statusMatched = activeStatus === "all" || order.status === activeStatus;
    const keywordMatched =
      !keyword ||
      order.title.toLowerCase().includes(keyword) ||
      order.rawId.toLowerCase().includes(keyword) ||
      order.outTradeNo.toLowerCase().includes(keyword) ||
      order.userId.toLowerCase().includes(keyword);
    return statusMatched && keywordMatched;
  });
  const statusTabs = [
    { key: "all", label: "全部", count: allOrders.length },
    { key: "pending", label: "待付款", count: allOrders.filter((order) => order.status === "pending").length },
    { key: "paid", label: "已完成", count: allOrders.filter((order) => order.status === "paid").length },
    { key: "closed", label: "已关闭", count: allOrders.filter((order) => order.status === "closed").length },
    { key: "refund", label: "售后中", count: allOrders.filter((order) => order.status === "refund").length },
  ];
  const errors = [coursesResult, courseOrdersResult, productOrdersResult]
    .map((result) => result.error)
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link className="text-sm font-semibold text-blue-700" href="/admin">
              返回后台首页
            </Link>
            <h1 className="mt-2 text-2xl font-bold">全部订单</h1>
          </div>
          <Link className="rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700" href="/admin/users">
            用户列表
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {errors.length ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            部分数据读取失败：{errors.join("；")}
          </div>
        ) : null}

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <form className="grid gap-4 md:grid-cols-[1fr_180px_120px]" action="/admin/orders">
            <label className="text-sm font-medium text-slate-600">
              商品名称 / 订单号 / 买家
              <input
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
                defaultValue={params.keyword || ""}
                name="keyword"
                placeholder="请输入"
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              订单状态
              <select
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2"
                defaultValue={activeStatus}
                name="status"
              >
                {statusTabs.map((tab) => (
                  <option key={tab.key} value={tab.key}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white">
                筛选
              </button>
            </div>
          </form>
        </section>

        <section className="mt-5 rounded-lg bg-white shadow-sm">
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 pt-4">
            {statusTabs.map((tab) => (
              <Link
                className={`rounded-t-md border px-4 py-2 text-sm ${
                  activeStatus === tab.key
                    ? "border-blue-200 bg-blue-50 font-semibold text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
                href={`/admin/orders?status=${tab.key}`}
                key={tab.key}
              >
                {tab.label}
                <span className="ml-1 text-xs text-slate-400">{tab.count}</span>
              </Link>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">商品名称</th>
                  <th className="px-4 py-3">状态</th>
                  <th className="px-4 py-3">单价/数量</th>
                  <th className="px-4 py-3">订单号</th>
                  <th className="px-4 py-3">买家</th>
                  <th className="px-4 py-3">实收金额</th>
                  <th className="px-4 py-3">下单时间</th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const status = statusInfo(order.status);
                  return (
                    <tr className="border-t border-slate-100 align-top" key={order.id}>
                      <td className="px-4 py-4">
                        <div className="flex gap-3">
                          <img alt="" className="h-16 w-16 rounded-md object-cover" src={order.cover} />
                          <div>
                            <p className="max-w-[280px] font-semibold">{order.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{order.subtitle}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              类型：{order.type === "course" ? "课程专栏" : "服务商品"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-4 font-semibold ${status.className}`}>{order.statusText}</td>
                      <td className="px-4 py-4">
                        <p>{money(order.amount)}</p>
                        <p className="text-slate-400">x{order.quantity}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p>{order.rawId}</p>
                        {order.outTradeNo ? <p className="mt-1 text-xs text-slate-400">{order.outTradeNo}</p> : null}
                      </td>
                      <td className="px-4 py-4">
                        <Link className="text-blue-600" href="/admin/users">
                          {maskUserId(order.userId)}
                        </Link>
                      </td>
                      <td className="px-4 py-4 font-semibold">{money(order.amount)}</td>
                      <td className="px-4 py-4 text-slate-500">{formatTime(order.createdAt)}</td>
                      <td className="px-4 py-4">
                        <Link className="font-semibold text-blue-600" href={`/admin/orders/${order.type}/${order.rawId}`}>
                          订单详情
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!filteredOrders.length ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-slate-500" colSpan={8}>
                      没有符合条件的订单
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
