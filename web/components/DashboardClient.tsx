"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatUsdCents } from "@/lib/matching";

type MeData = {
  id: string;
  name: string | null;
  email: string;
  headline: string | null;
  bio: string | null;
  availableHours: string;
  city: string | null;
  profilePublic: boolean;
  reputation: number;
  earnedTotalCents: number;
  skills: string[];
  goal: string;
  sources: Array<{
    id: string;
    enabled: boolean;
    source: {
      id: string;
      key: string;
      name: string;
      description: string;
      lastSyncAt: string | null;
      lastError: string | null;
    };
  }>;
  shortlists: Array<{
    id: string;
    projectKey: string | null;
    task: null | {
      id: string;
      title: string;
      url: string;
      amountText: string | null;
      projectName: string;
    };
  }>;
  claims: Array<{
    id: string;
    status: string;
    taskId: string;
    task: {
      id: string;
      title: string;
      url: string;
      amountText: string | null;
      projectName: string;
    };
  }>;
  earnings: Array<{
    id: string;
    title: string;
    amountCents: number;
    projectName: string | null;
    earnedAt: string;
  }>;
};

const SKILL_OPTIONS = [
  "TypeScript",
  "JavaScript",
  "React",
  "Nextjs",
  "Python",
  "Go",
  "Rust",
  "Flutter",
  "Java",
  "C++",
];

const GOALS = [
  { id: "quick", title: "想快点接到单" },
  { id: "clear", title: "结算要清楚" },
  { id: "big", title: "想冲大额" },
  { id: "learn", title: "先练手涨经验" },
];

const HOURS = [
  { id: "flexible", title: "时间灵活" },
  { id: "parttime", title: "兼职可接" },
  { id: "weekends", title: "周末可接" },
  { id: "fulltime", title: "接近全职" },
];

export function DashboardClient() {
  const { status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [earnTitle, setEarnTitle] = useState("");
  const [earnAmount, setEarnAmount] = useState("100");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");

  async function refresh() {
    const res = await fetch("/api/me");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setMe(data);
    setHeadline(data.headline || "");
    setBio(data.bio || "");
    setCity(data.city || "");
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") refresh();
  }, [status, router]);

  async function saveProfile(patch: Record<string, unknown>) {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setMsg(res.ok ? "已保存" : "保存失败");
    if (res.ok) await refresh();
  }

  async function toggleSource(sourceId: string, enabled: boolean) {
    await fetch("/api/me/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, enabled }),
    });
    setMsg(enabled ? "已启用数据源" : "已关闭数据源");
    await refresh();
  }

  async function sync(key?: string) {
    setSyncing(true);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(key ? { key } : {}),
    });
    const data = await res.json();
    setSyncing(false);
    setMsg(res.ok ? "同步完成" : data.error || "同步失败");
    await refresh();
  }

  async function updateClaim(taskId: string, nextStatus: string) {
    const res = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status: nextStatus }),
    });
    setMsg(res.ok ? "认领状态已更新" : "更新失败");
    await refresh();
  }

  async function addEarning() {
    const dollars = Number(earnAmount);
    if (!earnTitle || !Number.isFinite(dollars) || dollars <= 0) {
      setMsg("请填写收益标题和金额（美元）");
      return;
    }
    const res = await fetch("/api/earnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: earnTitle,
        amountCents: Math.round(dollars * 100),
      }),
    });
    if (res.ok) {
      setEarnTitle("");
      setEarnAmount("100");
      setMsg("已记录收益，并同步到社区动态");
      await refresh();
    } else {
      setMsg("记录失败");
    }
  }

  async function removeShortlist(taskId?: string | null, projectKey?: string | null) {
    const params = new URLSearchParams();
    if (taskId) params.set("taskId", taskId);
    if (projectKey) params.set("projectKey", projectKey);
    await fetch(`/api/me/shortlist?${params}`, { method: "DELETE" });
    await refresh();
  }

  if (status === "loading" || !me) {
    return <div className="panel empty">加载工作台…</div>;
  }

  return (
    <div className="dashboard">
      <section className="panel">
        <div className="dash-top">
          <div>
            <h2>你好，{me.name || me.email}</h2>
            <p className="hint">
              信誉 {me.reputation} · 自报收益 {formatUsdCents(me.earnedTotalCents)} ·{" "}
              <Link href={`/u/${me.id}`}>公开主页 ↗</Link>
            </p>
          </div>
          <div className="hall-actions">
            <button type="button" className="btn gold" disabled={syncing} onClick={() => sync()}>
              {syncing ? "同步中…" : "同步全部数据源"}
            </button>
            <Link href="/community" className="btn primary">
              社区协作
            </Link>
          </div>
        </div>
        {msg && <p className="toast-inline">{msg}</p>}
      </section>

      <section className="panel">
        <h2>对外档案（凝聚信任）</h2>
        <p className="hint">写清楚你会什么、什么时间能接，方便伙伴转介任务。</p>
        <div className="form-grid">
          <label>
            一句话介绍
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="例：TS 全栈，擅长修 Expensify 类 UI bounty"
            />
          </label>
          <label>
            城市 / 时区（可选）
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="上海 / UTC+8" />
          </label>
          <label className="full">
            简介
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="过往接单经验、擅长栈、沟通方式…"
            />
          </label>
        </div>
        <div className="skill-cloud" style={{ marginTop: "0.8rem" }}>
          {HOURS.map((h) => (
            <button
              key={h.id}
              type="button"
              className={`skill-chip ${me.availableHours === h.id ? "active" : ""}`}
              onClick={() => saveProfile({ availableHours: h.id })}
            >
              {h.title}
            </button>
          ))}
          <button
            type="button"
            className={`skill-chip ${me.profilePublic ? "active" : ""}`}
            onClick={() => saveProfile({ profilePublic: !me.profilePublic })}
          >
            {me.profilePublic ? "✓ 主页公开" : "主页未公开"}
          </button>
        </div>
        <button
          type="button"
          className="btn gold"
          style={{ marginTop: "0.8rem" }}
          onClick={() => saveProfile({ headline, bio, city })}
        >
          保存档案
        </button>
      </section>

      <section className="panel">
        <h2>我的目标</h2>
        <div className="goal-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`goal-card ${me.goal === g.id ? "active" : ""}`}
              onClick={() => saveProfile({ goal: g.id })}
            >
              <strong>{g.title}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>我的技能</h2>
        <div className="skill-cloud">
          {SKILL_OPTIONS.map((skill) => {
            const active = me.skills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                className={`skill-chip ${active ? "active" : ""}`}
                onClick={() => {
                  const next = active
                    ? me.skills.filter((s) => s !== skill)
                    : [...me.skills, skill];
                  saveProfile({ skills: next });
                }}
              >
                {active ? "✓ " : ""}
                {skill}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>我认领的单（防撞车）</h2>
        <p className="hint">推进状态会同步到社区，方便伙伴知道你在忙什么。</p>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {me.claims.length === 0 && <p className="muted">还没有认领，去大厅点「我来接这单」。</p>}
          {me.claims.map((c) => (
            <article key={c.id} className="task-card">
              <div className="task-main">
                <div className="task-meta">
                  <span className="mini-tag">{c.status}</span>
                  {c.task.amountText && (
                    <span className="gold-text amount">{c.task.amountText}</span>
                  )}
                </div>
                <h4>{c.task.title}</h4>
                <p className="muted">{c.task.projectName}</p>
              </div>
              <div className="detail-cta-stack">
                <a className="btn primary" href={c.task.url} target="_blank" rel="noreferrer">
                  打开 ↗
                </a>
                {c.status === "working" && (
                  <button
                    type="button"
                    className="btn gold"
                    onClick={() => updateClaim(c.taskId, "submitted")}
                  >
                    标记已提交
                  </button>
                )}
                {c.status === "submitted" && (
                  <button
                    type="button"
                    className="btn gold"
                    onClick={() => updateClaim(c.taskId, "paid")}
                  >
                    标记已收款
                  </button>
                )}
                {c.status !== "dropped" && c.status !== "paid" && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => updateClaim(c.taskId, "dropped")}
                  >
                    放弃让出
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>收益账本</h2>
        <p className="hint">自报实收，形成你的灵活就业履历（公开主页可见）。</p>
        <div className="earn-form">
          <input
            value={earnTitle}
            onChange={(e) => setEarnTitle(e.target.value)}
            placeholder="例如：Expensify $250 UI 修复"
          />
          <input
            value={earnAmount}
            onChange={(e) => setEarnAmount(e.target.value)}
            placeholder="金额 USD"
            type="number"
            min={1}
          />
          <button type="button" className="btn gold" onClick={addEarning}>
            记一笔
          </button>
        </div>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {me.earnings.map((e) => (
            <article key={e.id} className="task-card">
              <div className="task-main">
                <h4>{e.title}</h4>
                <p className="muted">{new Date(e.earnedAt).toLocaleDateString("zh-CN")}</p>
              </div>
              <span className="gold-text">{formatUsdCents(e.amountCents)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>数据源管理</h2>
        <div className="source-manage">
          {me.sources.map((s) => (
            <div key={s.source.id} className="source-row">
              <div>
                <strong>{s.source.name}</strong>
                <p className="muted">{s.source.description}</p>
                <p className="muted">
                  上次同步：
                  {s.source.lastSyncAt
                    ? new Date(s.source.lastSyncAt).toLocaleString("zh-CN")
                    : "尚未同步"}
                  {s.source.lastError ? ` · 错误：${s.source.lastError}` : ""}
                </p>
              </div>
              <div className="detail-cta-stack">
                <button
                  type="button"
                  className={`btn ${s.enabled ? "primary" : "ghost"}`}
                  onClick={() => toggleSource(s.source.id, !s.enabled)}
                >
                  {s.enabled ? "已启用" : "已关闭"}
                </button>
                <button
                  type="button"
                  className="btn gold"
                  disabled={syncing}
                  onClick={() => sync(s.source.key)}
                >
                  同步此源
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>我的短名单</h2>
        <div className="task-list">
          {me.shortlists.length === 0 && <p className="muted">还没有收藏。</p>}
          {me.shortlists.map((item) => (
            <article key={item.id} className="task-card">
              <div className="task-main">
                <h4>{item.task?.title || item.projectKey}</h4>
                <p className="muted">
                  {item.task?.projectName}
                  {item.task?.amountText ? ` · ${item.task.amountText}` : ""}
                </p>
              </div>
              <div className="detail-cta-stack">
                {item.task?.url && (
                  <a className="btn gold" href={item.task.url} target="_blank" rel="noreferrer">
                    去接 ↗
                  </a>
                )}
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => removeShortlist(item.task?.id, item.projectKey)}
                >
                  移除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
