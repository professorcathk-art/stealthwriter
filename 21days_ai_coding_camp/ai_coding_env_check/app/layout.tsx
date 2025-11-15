import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "文案去除 AI 味改寫器",
  description: "使用 DeepSeek 與 Supabase 登入的文案改寫工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}

