"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function SiteHeader() {
  const { data, status } = useSession();
  const pathname = usePathname();

  return (
    <header className="topnav">
      <Link href="/" className="topnav-brand">
        Open<span>Tacker</span>
      </Link>
      <nav className="topnav-links">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          悬赏大厅
        </Link>
        <Link href="/match" className={pathname === "/match" ? "active" : ""}>
          智能匹配
        </Link>
        <Link
          href="/community"
          className={pathname.startsWith("/community") ? "active" : ""}
        >
          协作社区
        </Link>
        {status === "authenticated" ? (
          <>
            <Link
              href="/dashboard"
              className={pathname.startsWith("/dashboard") ? "active" : ""}
            >
              我的工作台
            </Link>
            <button type="button" className="linkish" onClick={() => signOut({ callbackUrl: "/" })}>
              退出 {data.user?.name || ""}
            </button>
          </>
        ) : (
          <>
            <Link href="/login">登录</Link>
            <Link href="/register" className="btn-mini">
              加入
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
