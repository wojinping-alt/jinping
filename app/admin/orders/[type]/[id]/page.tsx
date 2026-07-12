import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type RouteParams = Promise<{ type: string; id: string }>;

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

type DetailOrder = {
  id: string;
  type: "course" | "product";
  title: string;
  subtitle: string;
  cover: string;
  userId: string;
  amount: number;
  quantity: number;
  status: string;
  createdAt: string | null;
  paidAt: string | null;
  outTradeNo: string;
};

async function safeSingle<T>(
  loader: () => PromiseLike<{ data: T | null; error: { message: string } | null }>
) {
  try {
    const { data, error } = await Promise.resolve(loader());
    return { data, error: error?.message || "" };
  } catch (error) {
    return {
      data: null as T | null,
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
  if (status === "paid") return { text: "交易完成", tone: "bg-blue-50 text-blue-700", reason: "用户已完成支付" };
  if (status === "pending") return { text: "待付款", tone: "bg-orange-50 text-orange-700", reason: "等待用户完成微信支付" };
  if (status === "refund" || status === "refunded") {
    return { text: "退款/售后", tone: "bg-purple-50 text-purple-700", reason: "订单进入售后流程" };
  }
  if (status === "closed" || status === "cancelled" || status === "canceled") {
    return { text: "交易关闭", tone: "bg-slate-100 text-slate-600", reason: "用户已取消或订单已关闭" };
  }
  return { text: status || "未知状态", tone: "bg-slate-100 text-slate-600", reason: "暂无更多状态说明" };
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
  return `${id.slice(0, 10)}...${id.slice(-8)}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium text-slate-800">{value || "--"}</dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({ params }: { params: RouteParams }) {
  if (!(await isAdminAuthed())) {
    redirect("/admin/login");
  }

  const { type, id } = await params;
  if (type !== "course" && type !== "product") {
    notFound();
  }

  const supabase = createAdminClient();
  let detail: DetailOrder | null = null;
  let loadError = "";

  if (type === "course") {
    const orderResult = await safeSingle<CourseOrderRow>(() =>
      supabase
        .from("orders")
        .select("id,user_id,course_id,out_trade_no,amount,status,created_at,paid_at")
        .eq("id", id)
        .maybeSingle<CourseOrderRow>()
    );
    loadError = orderResult.error;
    if (!orderResult.data) notFound();

    const courseResult = orderResult.data.course_id
      ? await safeSingle<CourseRow>(() =>
          supabase
            .from("courses")
            .select("id,title,description")
            .eq("id", orderResult.data!.course_id)
            .maybeSingle<CourseRow>()
        )
      : { data: null, error: "" };
    const title = courseResult.data?.title || `课程 ${orderResult.data.course_id || ""}`;
    detail = {
      id: String(orderResult.data.id),
      type: "course",
      title,
      subtitle: courseResult.data?.description || "文字的 文化的 艺术的 一课三得",
      cover: courseCover(title),
      userId: orderResult.data.user_id || "",
      amount: Number(orderResult.data.amount || 0),
      quantity: 1,
      status: orderResult.data.status || "unknown",
      createdAt: orderResult.data.created_at,
      paidAt: orderResult.data.paid_at || null,
      outTradeNo: orderResult.data.out_trade_no || "",
    };
    loadError = loadError || courseResult.error;
  } else {
    const orderResult = await safeSingle<ProductOrderRow>(() =>
      supabase
        .from("product_orders")
        .select("id,user_id,product_title,product_type,quantity,out_trade_no,amount,status,created_at,paid_at")
        .eq("id", id)
        .maybeSingle<ProductOrderRow>()
    );
    loadError = orderResult.error;
    if (!orderResult.data) notFound();

    const title = orderResult.data.product_title || "字书服务商品";
    detail = {
      id: String(orderResult.data.id),
      type: "product",
      title,
      subtitle: orderResult.data.product_type ? `类型：${orderResult.data.product_type}` : "服务类商品",
      cover: productCover(title),
      userId: orderResult.data.user_id || "",
      amount: Number(orderResult.data.amount || 0),
      quantity: Number(orderResult.data.quantity || 1),
      status: orderResult.data.status || "unknown",
      createdAt: orderResult.data.created_at,
      paidAt: orderResult.data.paid_at || null,
      outTradeNo: orderResult.data.out_trade_no || "",
    };
  }

  const status = statusInfo(detail.status);
  const subtotal = detail.amount * detail.quantity;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="text-sm text-slate-500">
            <Link className="text-blue-700" href="/admin/orders">
              全部订单
            </Link>
            <span className="mx-2">/</span>
            <span>订单详情</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">订单详情</h1>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {loadError ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            部分数据读取失败：{loadError}
          </div>
        ) : null}

        <section className={`rounded-lg px-6 py-5 shadow-sm ${status.tone}`}>
          <p className="text-xl font-bold">{status.text}</p>
          <p className="mt-1 text-sm opacity-80">{status.reason}</p>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="border-l-4 border-blue-600 pl-3 text-lg font-bold">订单信息</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="订单号" value={detail.id} />
              <Field label="订单类型" value={detail.type === "course" ? "课程专栏" : "服务商品"} />
              <Field label="订单状态" value={status.text} />
              <Field label="下单时间" value={formatTime(detail.createdAt)} />
              <Field label="支付时间" value={formatTime(detail.paidAt)} />
              <Field label="支付方式" value="微信支付" />
              <Field label="商户订单号" value={detail.outTradeNo || "--"} />
              <Field label="收款方式" value="字书服务商户收款" />
              <Field label="渠道来源" value="字书小程序" />
            </dl>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="border-l-4 border-blue-600 pl-3 text-lg font-bold">买家信息</h2>
            <dl className="mt-5 space-y-4">
              <Field label="买家昵称" value={maskUserId(detail.userId)} />
              <Field label="用户 ID" value={detail.userId || "--"} />
              <Field label="买家手机号" value="--" />
              <Field label="买家留言" value="--" />
            </dl>
          </div>
        </section>

        <section className="mt-5 rounded-lg bg-white p-5 shadow-sm">
          <h2 className="border-l-4 border-blue-600 pl-3 text-lg font-bold">商品信息</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">商品名称</th>
                  <th className="px-4 py-3">商品类型</th>
                  <th className="px-4 py-3">单价</th>
                  <th className="px-4 py-3">数量</th>
                  <th className="px-4 py-3">小计</th>
                  <th className="px-4 py-3">发货状态</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img alt="" className="h-16 w-16 rounded-md object-cover" src={detail.cover} />
                      <div>
                        <p className="max-w-[360px] font-semibold">{detail.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{detail.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">{detail.type === "course" ? "专栏" : "服务类商品"}</td>
                  <td className="px-4 py-4">{money(detail.amount)}</td>
                  <td className="px-4 py-4">{detail.quantity}</td>
                  <td className="px-4 py-4 font-semibold">{money(subtotal)}</td>
                  <td className="px-4 py-4 text-blue-600">{detail.type === "course" ? "在线发放" : "未发货"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">合计</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">优惠</span>
                <span>¥ 0.00</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold">
                <span>订单实收金额</span>
                <span>{detail.status === "paid" ? money(subtotal) : "¥ 0.00"}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
