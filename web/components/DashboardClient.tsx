"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MeData = {
  name: string | null;
  email: string;
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

export function DashboardClient() {
  const { status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [msg, setMsg] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function refresh() {
    const res = await fetch("/api/me");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    setMe(await res.json());
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
    if (res.ok) {
      setMsg("已保存");
      await refresh();
    } else {
      setMsg("保存失败");
    }
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
        <h2>你好，{me.name || me.email}</h2>
        <p className="hint">在这里维护技能、目标、数据源和短名单。大厅会按你的启用源过滤任务。</p>
        {msg && <p className="toast-inline">{msg}</p>}
        <div className="hall-actions" style={{ marginTop: "0.8rem" }}>
          <button type="button" className="btn gold" disabled={syncing} onClick={() => sync()}>
            {syncing ? "同步中…" : "同步全部数据源"}
          </button>
          <Link href="/" className="btn primary">
            回悬赏大厅
          </Link>
        </div>
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
        <h2>数据源管理</h2>
        <p className="hint">关闭后，大厅默认不再展示该来源的任务；仍可单独同步。</p>
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
        {me.shortlists.length === 0 && <p className="muted">还没有收藏，去大厅点☆吧。</p>}
        <div className="task-list">
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
