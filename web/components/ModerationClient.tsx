"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PendingItem = {
  id: string;
  title: string;
  summary: string | null;
  engagementType: string;
  publisher: { id: string; name: string | null; email: string; reputation: number } | null;
};

type ReportItem = {
  id: string;
  reason: string;
  detail: string | null;
  task: { id: string; title: string; moderationStatus: string };
  reporter: { id: string; name: string | null; email: string };
};

export function ModerationClient() {
  const { status } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/moderation");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "无权限");
      return;
    }
    setError("");
    setPending(data.pending || []);
    setReports(data.reports || []);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/moderation");
    if (status === "authenticated") load();
  }, [status, router]);

  async function act(taskId: string, action: "approve" | "reject" | "take_down", reportId?: string) {
    const res = await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action, reportId }),
    });
    const data = await res.json();
    setMsg(res.ok ? `已处理：${action}` : data.error || "失败");
    if (res.ok) await load();
  }

  if (status === "loading") return <div className="panel empty">加载中…</div>;
  if (error) {
    return (
      <div className="panel human-empty">
        <strong>{error}</strong>
        <p>审核台仅对 moderator 或 MODERATOR_EMAILS 白名单开放。</p>
        <Link href="/">回大厅</Link>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <section className="panel">
        <h1>审核台</h1>
        <p className="hint">通过 / 驳回待审机会，处理举报并下架违规内容。</p>
        {msg && <p className="toast-inline">{msg}</p>}
      </section>

      <section className="panel">
        <h2>待审机会（{pending.length}）</h2>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {pending.length === 0 && <p className="muted">暂无待审</p>}
          {pending.map((p) => (
            <article key={p.id} className="task-card">
              <div className="task-main">
                <div className="task-meta">
                  <span className="mini-tag">{p.engagementType}</span>
                  <span className="muted">
                    {p.publisher?.name || p.publisher?.email} · 信誉 {p.publisher?.reputation ?? 0}
                  </span>
                </div>
                <h4>{p.title}</h4>
                <p className="muted">{p.summary?.slice(0, 160)}</p>
                {p.publisher && (
                  <Link href={`/u/${p.publisher.id}`}>查看发布者档案 ↗</Link>
                )}
              </div>
              <div className="detail-cta-stack">
                <button type="button" className="btn gold" onClick={() => act(p.id, "approve")}>
                  通过
                </button>
                <button type="button" className="btn ghost" onClick={() => act(p.id, "reject")}>
                  驳回
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>开放举报（{reports.length}）</h2>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {reports.length === 0 && <p className="muted">暂无举报</p>}
          {reports.map((r) => (
            <article key={r.id} className="task-card">
              <div className="task-main">
                <div className="task-meta">
                  <span className="mini-tag">{r.reason}</span>
                  <span className="muted">举报人 {r.reporter.name || r.reporter.email}</span>
                </div>
                <h4>{r.task.title}</h4>
                {r.detail && <p className="muted">{r.detail}</p>}
              </div>
              <div className="detail-cta-stack">
                <button
                  type="button"
                  className="btn gold"
                  onClick={() => act(r.task.id, "take_down", r.id)}
                >
                  下架
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => act(r.task.id, "approve", r.id)}
                >
                  驳回举报并保留
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
