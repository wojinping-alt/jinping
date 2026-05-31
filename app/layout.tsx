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
        <CanonicalRedirect />
        <Navbar />

        {children}
      </body>
    </html>
  );
}
