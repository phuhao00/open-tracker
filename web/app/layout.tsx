import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Sora } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "OpenTacker · 付费开源接单助手",
  description: "多源自动抓取悬赏任务，注册登录后管理技能、数据源与短名单",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${sora.variable} ${plexSans.variable} ${plexMono.variable}`}>
        <Providers>
          <div className="shell">
            <SiteHeader />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
