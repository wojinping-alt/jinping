import Link from "next/link";
import { isAdminConfigured } from "@/lib/admin-auth";
import { loginAdminAction } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const configured = isAdminConfigured();

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm text-slate-500">Zishoo Admin</p>
          <h1 className="mt-2 text-3xl font-bold">字书管理后台</h1>
          <p className="mt-3 text-sm text-slate-500">
            用于查看课程、订单、用户与运营数据。
          </p>
        </div>

        {!configured ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            后台密码还没有配置。请先在 EdgeOne 环境变量里新增
            <span className="mx-1 font-mono font-semibold">ADMIN_PASSWORD</span>
            ，然后重新部署。
          </div>
        ) : (
          <form action={loginAdminAction} className="space-y-4">
            <label className="block text-sm font-semibold">
              后台密码
              <input
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-3 outline-none focus:border-orange-500"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入 ADMIN_PASSWORD"
              />
            </label>

            {params?.error ? (
              <p className="text-sm text-red-600">密码不正确，请重新输入。</p>
            ) : null}

            <button className="w-full rounded-md bg-orange-600 px-4 py-3 font-semibold text-white">
              登录后台
            </button>
          </form>
        )}

        <Link className="mt-6 inline-block text-sm text-slate-500" href="/">
          返回网站首页
        </Link>
      </div>
    </main>
  );
}
