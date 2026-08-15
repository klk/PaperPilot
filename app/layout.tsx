import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { normalizeLocale } from "../lib/i18n";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "PaperPilot Tools | 简单、私密的 PDF 工具", template: "%s | PaperPilot" },
  description: "免费的在线 PDF 工具：合并、拆分、压缩、转换和编辑 PDF。文件在浏览器中处理，简单、快速、私密。",
  keywords: ["PDF tools", "merge PDF", "compress PDF", "PDF converter", "online PDF tools"],
  openGraph: { title: "PaperPilot Tools", description: "让 PDF 工作更轻松。", type: "website" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = normalizeLocale((await cookies()).get("paperpilot-locale")?.value);
  return <html lang={locale === "zh" ? "zh-CN" : locale}><body>{children}</body></html>;
}
