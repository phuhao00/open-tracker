"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export function SiteHeader() {
  const { data, status } = useSession();
  const pathname = usePathname();
  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (isAuth) {
    return (
      <header className="topnav topnav-auth">
        <Link href="/" className="topnav-brand">
          Open<span>Tacker</span>
        </Link>
        <Link href="/" className="topnav-back">
          返回大厅
        </Link>
      </header>
    );
  }

  return (
    <header className="topnav">
      <Link href="/" className="topnav-brand">
        Open<span>Tacker</span>
      </Link>
      <nav className="topnav-links">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          大厅
        </Link>
        <Link href="/match" className={pathname === "/match" ? "active" : ""}>
          匹配
        </Link>
        <Link
          href="/community"
          className={pathname.startsWith("/community") ? "active" : ""}
        >
          社区
        </Link>
        {status === "authenticated" ? (
          <>
            <Link
              href="/dashboard"
              className={pathname.startsWith("/dashboard") ? "active" : ""}
            >
              工作台
            </Link>
            <button
              type="button"
              className="linkish"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              退出
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={pathname.startsWith("/login") ? "active" : ""}>
              登录
            </Link>
            <Link href="/register" className="btn-mini">
              注册
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
