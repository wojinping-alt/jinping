import Link from "next/link";

function getErrorMessage(error?: string) {
  switch (error) {
    case "missing_wechat_config":
      return "微信登录配置不完整，请检查 WECHAT_APP_ID/WECHAT_APP_SECRET 或开放平台配置。";
    case "missing_open_app":
      return "电脑端微信扫码登录需要微信开放平台“网站应用”的 WECHAT_OPEN_APP_ID，公众号 AppID 没有 snsapi_login 权限。";
    case "wechat_token_failed":
      return "微信授权失败。电脑扫码登录需要微信开放平台网站应用，不是普通公众号 AppID。";
    case "wechat_login_failed":
      return "微信登录失败，请稍后重试。";
    case "missing_code":
      return "微信没有返回授权码，请重新扫码。";
    default:
      return "";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = getErrorMessage(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">微信扫码登录</h1>
        <p className="mt-3 text-sm text-gray-500">
          电脑端会打开微信官方扫码登录页；手机微信内会直接走微信授权。
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-left text-sm text-red-600">
            {message}
          </p>
        )}

        <Link
          href="/api/wechat/login"
          className="mt-6 block rounded-lg bg-green-500 px-5 py-3 font-medium text-white hover:bg-green-600"
        >
          使用微信登录
        </Link>

        <p className="mt-5 text-xs leading-5 text-gray-400">
          提示：真正的网页扫码登录需要微信开放平台“网站应用”并配置授权回调域名。
        </p>
      </div>
    </div>
  );
}
