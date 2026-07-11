"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PaginationBar } from "@/components/PaginationBar";

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
  matchScore: number | null;
  matchReasons: string[];
  activeClaims: Array<{ id: string; status: string; user: { id: string; name: string | null } }>;
  source: { key: string; name: string };
};

type SourceFacet = { key: string; name: string; count: number };

const SOURCE_LABEL: Record<string, string> = {
  paid_list: "付费列表",
  github_search: "GitHub",
  algora: "Algora",
};

const PAGE_SIZE = 10;

export function BountyHall() {
  const { status } = useSession();
  const listRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<BountyItem[]>([]);
  const [facets, setFacets] = useState<SourceFacet[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("match");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [fadeKey, setFadeKey] = useState(0);

  const load = useCallback(
    async (opts?: {
      q?: string;
      source?: string;
      sort?: string;
      page?: number;
      scroll?: boolean;
    }) => {
      const nextQ = opts?.q ?? q;
      const nextSource = opts?.source ?? source;
      const nextSort = opts?.sort ?? sort;
      const nextPage = opts?.page ?? page;

      setLoading(true);
      const params = new URLSearchParams();
      if (nextQ) params.set("q", nextQ);
      if (nextSource) params.set("source", nextSource);
      params.set("sort", nextSort);
      params.set("page", String(nextPage));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/bounties?${params.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setFacets(data.facets?.sources || []);
      setPersonalized(Boolean(data.personalized));
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || nextPage);
      setFadeKey((k) => k + 1);
      setLoading(false);

      if (opts?.scroll) {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [q, source, sort, page],
  );

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const searchBoot = useRef(true);
  useEffect(() => {
    if (searchBoot.current) {
      searchBoot.current = false;
      return;
    }
    const t = setTimeout(() => {
      setPage(1);
      load({ q, page: 1 });
    }, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 4200);
    return () => clearTimeout(t);
  }, [message]);

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
    setPage(1);
    await load({ page: 1 });
  }

  async function saveTask(taskId: string) {
    if (status !== "authenticated") {
      setMessage("登录后才能收藏任务");
      return;
    }
    setBusyId(taskId);
    const res = await fetch("/api/me/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    setBusyId(null);
    setMessage(res.ok ? "已加入短名单" : "收藏失败");
  }

  async function claimTask(taskId: string) {
    if (status !== "authenticated") {
      setMessage("登录后才能认领，避免和伙伴撞车");
      return;
    }
    setBusyId(taskId);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error || "认领失败");
      return;
    }
    setMessage(data.warning || "已认领：社区伙伴能看到你在做这单");
    await load();
  }

  function changePage(next: number) {
    setPage(next);
    load({ page: next, scroll: true });
  }

  return (
    <section className="hall">
      <div className="panel hall-hero">
        <div>
          <h2>悬赏大厅</h2>
          <p className="hint">
            每页精选 {PAGE_SIZE} 条，按你的节奏浏览。登录后按技能排序，认领后伙伴可见，减少撞车。
          </p>
          <div className="source-pills" role="tablist" aria-label="数据源筛选">
            {facets.length === 0 && <span className="mini-tag">暂无数据，先点同步</span>}
            <button
              type="button"
              className={`skill-chip ${source === "" ? "active" : ""}`}
              onClick={() => {
                setSource("");
                setPage(1);
                load({ source: "", page: 1 });
              }}
            >
              全部 · {facets.reduce((s, f) => s + f.count, 0) || total}
            </button>
            {facets.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`skill-chip ${source === f.key ? "active" : ""}`}
                onClick={() => {
                  const next = source === f.key ? "" : f.key;
                  setSource(next);
                  setPage(1);
                  load({ source: next, page: 1 });
                }}
              >
                {SOURCE_LABEL[f.key] || f.name} · {f.count}
              </button>
            ))}
          </div>
          {personalized && (
            <p className="toast-inline">已按你的技能与目标做个性化排序</p>
          )}
        </div>
        <div className="hall-actions">
          <button type="button" className="btn gold" onClick={syncAll} disabled={syncing}>
            {syncing ? "同步中…" : "立即抓取网上悬赏"}
          </button>
          {status !== "authenticated" ? (
            <Link href="/register" className="btn primary">
              加入协作网络
            </Link>
          ) : (
            <Link href="/community" className="btn primary">
              看社区动态
            </Link>
          )}
          <Link href="/match" className="btn ghost">
            去智能匹配
          </Link>
        </div>
      </div>

      <div className="toolbar compact panel sticky-toolbar" style={{ marginTop: "1rem" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索标题 / 项目 / 金额…"
          aria-label="搜索悬赏"
        />
        <select
          value={sort}
          aria-label="排序方式"
          onChange={(e) => {
            const next = e.target.value;
            setSort(next);
            setPage(1);
            load({ sort: next, page: 1 });
          }}
        >
          <option value="match">最适合我</option>
          <option value="amount">金额优先</option>
          <option value="newest">最新抓取</option>
        </select>
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            setPage(1);
            load({ page: 1 });
          }}
        >
          刷新
        </button>
      </div>

      {message && (
        <p className="toast-inline toast-live" role="status">
          {message}
        </p>
      )}

      <div ref={listRef} className="list-anchor">
        <div key={fadeKey} className={`task-list list-stage ${loading ? "is-loading" : ""}`}>
          {loading && items.length === 0 && (
            <div className="panel empty soft">
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="panel human-empty">
              <strong>这一页没有结果</strong>
              <p>换个关键词，或点「立即抓取网上悬赏」拉取最新机会。</p>
            </div>
          )}
          {items.map((item, idx) => (
            <article
              key={item.id}
              className="task-card task-card-interactive"
              style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
            >
              <div className="task-main">
                <div className="task-meta">
                  <span className="mini-tag">
                    {SOURCE_LABEL[item.source.key] || item.source.name}
                  </span>
                  <span className="badge badge-accent">{item.kind}</span>
                  {item.amountText && (
                    <span className="gold-text amount">{item.amountText}</span>
                  )}
                  {item.matchScore != null && (
                    <span className="score">适合度 {item.matchScore}</span>
                  )}
                </div>
                <h4>{item.title}</h4>
                <p className="muted">
                  {item.projectName}
                  {item.repo ? ` · ${item.repo}` : ""}
                  {item.summary ? ` · ${item.summary.slice(0, 90)}` : ""}
                </p>
                {item.matchReasons?.length > 0 && (
                  <p className="why-line">{item.matchReasons.join(" · ")}</p>
                )}
                {item.activeClaims?.length > 0 && (
                  <p className="claim-hint">
                    协作中：
                    {item.activeClaims
                      .map((c) => c.user.name || "伙伴")
                      .slice(0, 3)
                      .join("、")}
                    {item.activeClaims.length > 3 ? " 等" : ""} 已认领
                  </p>
                )}
                <div className="pick-tags">
                  {item.techTags.slice(0, 6).map((t) => (
                    <span key={t} className="mini-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="detail-cta-stack">
                <button
                  type="button"
                  className="btn gold claim"
                  disabled={busyId === item.id}
                  onClick={() => claimTask(item.id)}
                >
                  {busyId === item.id ? "处理中…" : "我来接这单"}
                </button>
                <a className="btn primary" href={item.url} target="_blank" rel="noreferrer">
                  打开任务页 ↗
                </a>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busyId === item.id}
                  onClick={() => saveTask(item.id)}
                >
                  ☆ 收藏
                </button>
              </div>
            </article>
          ))}
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={changePage}
          disabled={loading || syncing}
          label="条悬赏"
        />
      </div>
    </section>
  );
}
