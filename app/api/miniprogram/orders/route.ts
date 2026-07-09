import { NextResponse } from "next/server";
import { getPayUser } from "@/lib/pay-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type CourseOrderRow = {
  id: string | number;
  out_trade_no?: string | null;
  course_id: string | number | null;
  amount: number | string | null;
  status: string | null;
  created_at?: string | null;
  paid_at?: string | null;
};

type ProductOrderRow = {
  id: string | number;
  out_trade_no?: string | null;
  product_title?: string | null;
  product_type?: string | null;
  quantity?: number | string | null;
  amount?: number | string | null;
  status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
};

type CourseRow = {
  id: string | number;
  title: string;
  description?: string | null;
};

function getCourseCover(title: string) {
  if (title.includes("Q2") || title.includes("第2季")) return "/assets/xet/q2-cover.jpg";
  if (title.includes("Q1") || title.includes("第1季")) return "/assets/xet/q1-cover.jpg";
  return "/assets/xet/goods-pack.jpg";
}

function getProductCover(title: string) {
  if (title.includes("图形纹样") || title.includes("纹样")) return "/assets/xet/playearn-product.jpg";
  return "/assets/xet/goods-pack.jpg";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getPendingRemainingText(status: string | null | undefined, createdAt: string | null | undefined) {
  if (status !== "pending" || !createdAt) return "";
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "";
  const remaining = created + 2 * 60 * 60 * 1000 - Date.now();
  if (remaining <= 0) return "已超时，可取消";
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}时${pad(minutes)}分${pad(seconds)}秒`;
}

function normalizeStatus(status: string | null | undefined) {
  if (status === "paid") return { key: "paid", label: "交易完成" };
  if (status === "closed" || status === "cancelled" || status === "canceled") {
    return { key: "closed", label: "交易关闭" };
  }
  if (status === "refunded" || status === "refund") return { key: "refund", label: "退款/售后" };
  return { key: "pending", label: "待付款" };
}

export async function GET(req: Request) {
  const { supabase, user } = await getPayUser(req);

  if (!user) {
    return NextResponse.json({ error: "请先登录小程序" }, { status: 401 });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const { data: courseOrders, error: courseOrderError } = await db
    .from("orders")
    .select("id,out_trade_no,course_id,amount,status,created_at,paid_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<CourseOrderRow[]>();

  if (courseOrderError) {
    return NextResponse.json({ error: courseOrderError.message }, { status: 500 });
  }

  const courseIds = Array.from(
    new Set((courseOrders || []).map((order) => order.course_id).filter(Boolean).map(String))
  );

  const courseById = new Map<string, CourseRow>();
  if (courseIds.length) {
    const { data: courses, error: courseError } = await db
      .from("courses")
      .select("id,title,description")
      .in("id", courseIds)
      .returns<CourseRow[]>();

    if (courseError) {
      return NextResponse.json({ error: courseError.message }, { status: 500 });
    }

    for (const course of courses || []) {
      courseById.set(String(course.id), course);
    }
  }

  let productOrders: ProductOrderRow[] = [];
  const { data: productData, error: productError } = await db
    .from("product_orders")
    .select("id,out_trade_no,product_title,product_type,quantity,amount,status,created_at,paid_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ProductOrderRow[]>();

  if (!productError) {
    productOrders = productData || [];
  }

  const courseItems = (courseOrders || []).map((order) => {
    const course = order.course_id ? courseById.get(String(order.course_id)) : null;
    const status = normalizeStatus(order.status);
    const title = course?.title || "字书课程";
    const amount = Number(order.amount || 0);
    return {
      id: `course-${order.id}`,
      orderId: String(order.id),
      courseId: order.course_id ? String(order.course_id) : "",
      outTradeNo: order.out_trade_no || "",
      type: "course",
      shopName: "字书",
      title,
      subtitle: course?.description || "文字的 文化的 艺术的 一课三得",
      coverImage: getCourseCover(title),
      amount,
      amountText: amount.toFixed(2),
      quantity: 1,
      status: status.key,
      statusLabel: status.label,
      remainingText: getPendingRemainingText(order.status, order.created_at),
      createdAt: order.created_at || "",
      createdAtText: formatDateTime(order.created_at),
      paidAtText: formatDateTime(order.paid_at),
    };
  });

  const productItems = productOrders.map((order) => {
    const status = normalizeStatus(order.status);
    const title = order.product_title || "字书服务商品";
    const quantity = Number(order.quantity || 1);
    const amount = Number(order.amount || 0);
    return {
      id: `product-${order.id}`,
      orderId: String(order.id),
      courseId: "",
      outTradeNo: order.out_trade_no || "",
      type: "product",
      shopName: "字书",
      title,
      subtitle: order.product_type ? `类型：${order.product_type}` : "服务类商品",
      coverImage: getProductCover(title),
      amount,
      amountText: amount.toFixed(2),
      quantity,
      status: status.key,
      statusLabel: status.label,
      remainingText: getPendingRemainingText(order.status, order.created_at),
      createdAt: order.created_at || "",
      createdAtText: formatDateTime(order.created_at),
      paidAtText: formatDateTime(order.paid_at),
    };
  });

  const orders = [...courseItems, ...productItems].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );

  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const { supabase, user } = await getPayUser(req);

  if (!user) {
    return NextResponse.json({ error: "请先登录小程序" }, { status: 401 });
  }

  const body = await req.json();
  const orderId = String(body.orderId || "");
  const type = String(body.type || "course");

  if (!orderId) {
    return NextResponse.json({ error: "缺少订单 ID" }, { status: 400 });
  }

  const db = (() => {
    try {
      return createAdminClient();
    } catch {
      return supabase;
    }
  })();

  const table = type === "product" ? "product_orders" : "orders";
  const { data, error } = await db
    .from(table)
    .update({ status: "closed" })
    .eq("id", orderId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "订单不存在或已不能取消" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
