import type { Metadata } from "next";
import "./globals.css";

import CanonicalRedirect from "@/components/CanonicalRedirect";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "字书 Zishoo",
  description: "汉字动画学习平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var host = window.location.host;
                if (window.location.protocol === 'http:' || host === 'zishoo.cn') {
                  var nextHost = host === 'zishoo.cn' ? 'www.zishoo.cn' : host;
                  window.location.replace('https://' + nextHost + window.location.pathname + window.location.search + window.location.hash);
                }
              })();
            `,
          }}
        />
        <CanonicalRedirect />
        <Navbar />

        {children}
      </body>
    </html>
  );
}
