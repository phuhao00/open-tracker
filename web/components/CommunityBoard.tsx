"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type CommunityData = {
  activities: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
    user: { id: string; name: string | null; reputation: number; skills: string[] };
    task: null | { id: string; title: string; url: string; amountText: string | null };
  }>;
  activeClaims: Array<{
    id: string;
    status: string;
    user: { id: string; name: string | null; reputation: number };
    task: { id: string; title: string; url: string; amountText: string | null; projectName: string };
  }>;
  freelancers: Array<{
    id: string;
    name: string | null;
    headline: string | null;
    skills: string[];
    reputation: number;
    availableHours: string;
    city: string | null;
    _count: { claims: number; earnings: number };
  }>;
};

const TYPE_LABEL: Record<string, string> = {
  joined: "加入",
  claimed: "认领",
  shared: "分享",
  submitted: "提交",
  paid: "收益",
  tip: "动态",
};

export function CommunityBoard() {
  const { status } = useSession();
  const [data, setData] = useState<CommunityData | null>(null);
  const [tip, setTip] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/community");
    setData(await res.json());
  }

  useEffect(() => {
    load().catch(() => setData({ activities: [], activeClaims: [], freelancers: [] }));
  }, []);

  async function postTip() {
    if (status !== "authenticated") {
      setMsg("登录后才能发协作提示");
      return;
    }
    const res = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: tip }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMsg(body.error || "发送失败");
      return;
    }
    setTip("");
    setMsg("已分享到社区");
    await load();
  }

  if (!data) return <div className="panel empty">加载社区…</div>;

  return (
    <div className="community-grid">
      <section className="panel">
        <h2>正在推进的单</h2>
        <p className="hint">看到有人认领，就换一单或先沟通，把灵活就业做成协作而不是内卷。</p>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {data.activeClaims.length === 0 && (
            <p className="muted">还没有进行中的认领，去大厅接一单吧。</p>
          )}
          {data.activeClaims.map((c) => (
            <article key={c.id} className="task-card">
              <div className="task-main">
                <div className="task-meta">
                  <Link href={`/u/${c.user.id}`} className="mini-tag">
                    {c.user.name || "伙伴"}
                  </Link>
                  <span className="badge" style={{ color: "#3DDC97", borderColor: "#3DDC9755" }}>
                    {c.status === "submitted" ? "已提交" : "进行中"}
                  </span>
                  {c.task.amountText && (
                    <span className="gold-text amount">{c.task.amountText}</span>
                  )}
                </div>
                <h4>{c.task.title}</h4>
                <p className="muted">{c.task.projectName}</p>
              </div>
              <a className="btn ghost" href={c.task.url} target="_blank" rel="noreferrer">
                看任务 ↗
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>社区动态</h2>
        <div className="earn-form" style={{ marginTop: "0.8rem" }}>
          <input
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="分享坑点、结算经验、或求组队…"
            maxLength={280}
          />
          <button type="button" className="btn gold" onClick={postTip}>
            发动态
          </button>
        </div>
        {msg && <p className="toast-inline">{msg}</p>}
        <div className="feed-list">
          {data.activities.length === 0 && <p className="muted">还没有动态，注册后会出现。</p>}
          {data.activities.map((a) => (
            <div key={a.id} className="feed-item">
              <div className="feed-top">
                <Link href={`/u/${a.user.id}`} className="gold-text">
                  {a.user.name || "伙伴"}
                </Link>
                <span className="mini-tag">{TYPE_LABEL[a.type] || a.type}</span>
                <span className="muted" style={{ fontSize: "0.78rem" }}>
                  {new Date(a.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <p>{a.message}</p>
              {a.task?.url && (
                <a href={a.task.url} target="_blank" rel="noreferrer" className="muted">
                  {a.task.title.slice(0, 60)} ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>灵活就业伙伴</h2>
        <p className="hint">按信誉排序，公开主页方便互相认识、组队或转介任务。</p>
        <div className="people-grid">
          {data.freelancers.map((u) => (
            <Link key={u.id} href={`/u/${u.id}`} className="person-card">
              <strong>{u.name || "未命名伙伴"}</strong>
              <span className="muted">{u.headline || "灵活就业 · 开源悬赏"}</span>
              <div className="pick-tags">
                {u.skills.slice(0, 4).map((s) => (
                  <span key={s} className="mini-tag">
                    {s}
                  </span>
                ))}
              </div>
              <div className="person-meta">
                <span>信誉 {u.reputation}</span>
                <span>认领 {u._count.claims}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
