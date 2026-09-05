import type { Metadata } from "next";

import { Header } from "@/components/header";

import "./globals.css";

export const runtime = "nodejs";

const vercelHostname =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (vercelHostname ? `https://${vercelHostname}` : "http://localhost:3000"),
  ),
  title: {
    default: "先锋活动站",
    template: "%s | 先锋活动站",
  },
  description: "非官方玩家活动报名与资料审核平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
