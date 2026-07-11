"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type BountyItem = {
  id: string;
  title: string;
  url: string;
  projectName: string;
  repo: string | null;
  amountText: string | null;
  amountMax: number | null;
  techTags: string[];
  kind: string;
  summary: string | null;
  source: { key: string; name: string };
};

const SOURCE_LABEL: Record<string, string> = {
  paid_list: "付费列表",
  github_search: "GitHub",
  algora: "Algora",
};

export function BountyHall() {
  const { status } = useSession();
  const [items, setItems] = useState<BountyItem[]>([]);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  async function load(nextQ = q, nextSource = source) {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextSource) params.set("source", nextSource);
    params.set("limit", "80");
    const res = await fetch(`/api/bounties?${params.toString()}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncAll() {
    if (status !== "authenticated") {
      setMessage("登录后才能手动同步网上悬赏");
      return;
    }
    setSyncing(true);
    setMessage("正在从多个数据源抓取…");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setMessage(data.error || "同步失败");
      return;
    }
    const summary = (data.results || [])
      .map((r: { key: string; count?: number; error?: string }) =>
        r.error ? `${r.key}:失败` : `${r.key}:${r.count}`,
      )
      .join(" · ");
    setMessage(`同步完成 ${summary}`);
    await load();
  }

  async function saveTask(taskId: string) {
    if (status !== "authenticated") {
      setMessage("登录后才能收藏任务");
      return;
    }
    const res = await fetch("/api/me/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    setMessage(res.ok ? "已加入短名单" : "收藏失败");
  }

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.source.key, (map.get(item.source.key) || 0) + 1);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <section className="hall">
      <div className="panel hall-hero">
        <div>
          <h2>悬赏大厅</h2>
          <p className="hint">
            自动聚合付费开源列表、GitHub 悬赏 Issue、Algora bounty。登录后可同步、收藏与管理数据源。
          </p>
          <div className="source-pills">
            {grouped.length === 0 && <span className="mini-tag">暂无数据，先点同步</span>}
            {grouped.map(([key, count]) => (
              <button
                key={key}
                type="button"
                className={`skill-chip ${source === key ? "active" : ""}`}
                onClick={() => {
                  const next = source === key ? "" : key;
                  setSource(next);
                  load(q, next);
                }}
              >
                {SOURCE_LABEL[key] || key} · {count}
              </button>
            ))}
          </div>
        </div>
        <div className="hall-actions">
          <button type="button" className="btn gold" onClick={syncAll} disabled={syncing}>
            {syncing ? "同步中…" : "立即抓取网上悬赏"}
          </button>
          {status !== "authenticated" && (
            <Link href="/login" className="btn ghost">
              登录后管理
            </Link>
          )}
          <Link href="/match" className="btn primary">
            去智能匹配
          </Link>
        </div>
      </div>

      <div className="toolbar compact panel" style={{ marginTop: "1rem" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索标题 / 项目 / 金额…"
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <button type="button" className="btn ghost" onClick={() => load()}>
          搜索
        </button>
      </div>

      {message && <p className="toast-inline">{message}</p>}

      <div className="task-list" style={{ marginTop: "1rem" }}>
        {loading && <div className="panel empty">加载中…</div>}
        {!loading && items.length === 0 && (
          <div className="panel human-empty">
            <strong>还没有悬赏数据</strong>
            <p>点「立即抓取网上悬赏」从多个来源拉取。未登录时也能浏览已有数据。</p>
          </div>
        )}
        {items.map((item) => (
          <article key={item.id} className="task-card">
            <div className="task-main">
              <div className="task-meta">
                <span className="mini-tag">{SOURCE_LABEL[item.source.key] || item.source.name}</span>
                <span className="badge" style={{ color: "#E8B84A", borderColor: "#E8B84A55" }}>
                  {item.kind}
                </span>
                {item.amountText && <span className="gold-text amount">{item.amountText}</span>}
              </div>
              <h4>{item.title}</h4>
              <p className="muted">
                {item.projectName}
                {item.repo ? ` · ${item.repo}` : ""}
                {item.summary ? ` · ${item.summary.slice(0, 100)}` : ""}
              </p>
              <div className="pick-tags">
                {item.techTags.slice(0, 6).map((t) => (
                  <span key={t} className="mini-tag">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="detail-cta-stack">
              <a className="btn gold claim" href={item.url} target="_blank" rel="noreferrer">
                去接任务 ↗
              </a>
              <button type="button" className="btn ghost" onClick={() => saveTask(item.id)}>
                ☆ 收藏
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
