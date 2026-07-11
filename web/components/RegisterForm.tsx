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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "注册失败");
      return;
    }
    const login = await signIn("credentials", {
      email,
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
    <form className="auth-card panel" onSubmit={onSubmit}>
      <h1>创建账号</h1>
      <p className="hint">注册后可维护技能、启用数据源，并收藏想接的任务。</p>
      <label>
        昵称
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="可选" />
      </label>
      <label>
        邮箱
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label>
        密码（至少 6 位）
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn gold" type="submit" disabled={loading}>
        {loading ? "创建中…" : "注册并进入工作台"}
      </button>
      <p className="auth-switch">
        已有账号？ <Link href="/login">去登录</Link>
      </p>
    </form>
  );
}
