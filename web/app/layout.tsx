import type { Metadata } from "next";
import { Outfit, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["500", "700"],
  display: "swap",
  preload: true,
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  weight: ["400", "600"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "OpenTacker · 全球灵活就业与招聘聚合",
  description: "发现开源悬赏、远程兼职岗位与招聘门户入口，按技能匹配并协作认领",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${outfit.variable} ${sourceSans.variable}`}>
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
