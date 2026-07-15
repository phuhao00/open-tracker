"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        email: email.trim(),
        password,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "注册失败");
      return;
    }
    const login = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError("注册成功，但自动登录失败，请手动登录");
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <aside className="auth-visual" aria-hidden="true">
        <p className="auth-kicker">Join the network</p>
        <h2 className="auth-visual-title">
          用一次注册
          <br />
          打开全球机会
        </h2>
        <p className="auth-visual-copy">
          邮箱只用于登录，不会出现在公开主页上。
        </p>
        <ul className="auth-points">
          <li>同步全网岗位与悬赏</li>
          <li>按技能匹配排序</li>
          <li>积累可展示的履历资产</li>
        </ul>
      </aside>

      <div className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <h1>创建账号</h1>
          <p className="hint">大约半分钟，完成后进入工作台</p>

          <label>
            昵称
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="可选"
              autoComplete="nickname"
              maxLength={60}
            />
          </label>
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
          <div className="auth-field-row">
            <label>
              密码
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
              />
            </label>
            <label>
              确认
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再输入一次"
              />
            </label>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn gold auth-submit" type="submit" disabled={loading}>
            {loading ? "创建中…" : "注册并继续"}
          </button>

          <p className="auth-switch">
            已有账号？ <Link href="/login">直接登录</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
