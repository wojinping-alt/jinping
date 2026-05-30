import Link from "next/link";

export default function PayPage() {
  return (
    <main className="min-h-screen bg-orange-50 p-6">
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-orange-600">课程支付</h1>
        <p className="mt-4 text-gray-600">
          请从课程详情页发起购买。电脑端会显示微信支付二维码，手机浏览器会跳转到微信支付。
        </p>
        <Link
          href="/courses"
          className="mt-6 inline-flex rounded-lg bg-orange-500 px-5 py-3 text-white hover:bg-orange-600"
        >
          返回课程列表
        </Link>
      </div>
    </main>
  );
}

