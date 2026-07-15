"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("邮箱或密码不对，再试一次");
      return;
    }
    router.push(callbackUrl.startsWith("/") ? callbackUrl : "/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <aside className="auth-visual" aria-hidden="true">
        <p className="auth-kicker">Flexible work network</p>
        <h2 className="auth-visual-title">
          找到下一份
          <br />
          灵活机会
        </h2>
        <p className="auth-visual-copy">
          悬赏、远程岗位与招聘入口，按技能匹配后直接行动。
        </p>
        <ul className="auth-points">
          <li>多源机会聚合</li>
          <li>认领防撞车协作</li>
          <li>公开履历与收益账本</li>
        </ul>
      </aside>

      <div className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>欢迎回来</h1>
          <p className="hint">用邮箱登录你的协作工作台</p>

          <label>
            邮箱
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>
          <label>
            密码
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn gold auth-submit" type="submit" disabled={loading}>
            {loading ? "正在登录…" : "登录"}
          </button>

          <p className="auth-switch">
            还没有账号？ <Link href="/register">创建账号</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
