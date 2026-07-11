"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("邮箱或密码不对，再试一次");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="auth-card panel" onSubmit={onSubmit}>
      <h1>欢迎回来</h1>
      <p className="hint">登录后可同步多源悬赏、管理技能与短名单。</p>
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
        密码
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
        {loading ? "登录中…" : "登录"}
      </button>
      <p className="auth-switch">
        还没有账号？ <Link href="/register">去注册</Link>
      </p>
    </form>
  );
}
