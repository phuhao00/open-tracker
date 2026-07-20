"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PaginationBar } from "@/components/PaginationBar";

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
  pagination: {
    activities: { page: number; pageSize: number; total: number; totalPages: number };
    claims: { page: number; pageSize: number; total: number; totalPages: number };
  };
};

const TYPE_LABEL: Record<string, string> = {
  joined: "加入",
  claimed: "认领",
  shared: "分享",
  submitted: "提交",
  paid: "收益",
  tip: "动态",
};

const emptyPagination = {
  activities: { page: 1, pageSize: 8, total: 0, totalPages: 1 },
  claims: { page: 1, pageSize: 6, total: 0, totalPages: 1 },
};

export function CommunityBoard() {
  const { status } = useSession();
  const [data, setData] = useState<CommunityData | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const [claimsPage, setClaimsPage] = useState(1);
  const [tip, setTip] = useState("");
  const [msg, setMsg] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (aPage = activityPage, cPage = claimsPage) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(aPage),
      limit: "8",
      claimsPage: String(cPage),
      claimsLimit: "6",
    });
    try {
      const res = await fetch(`/api/community?${params}`);
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error || "社区加载失败");
        setData((prev) => prev ?? {
          activities: [],
          activeClaims: [],
          freelancers: [],
          pagination: emptyPagination,
        });
        setLoading(false);
        return;
      }
      setData({
        ...body,
        pagination: body.pagination || emptyPagination,
      });
    } catch {
      setMsg("网络异常，社区加载失败");
      setData((prev) => prev ?? {
        activities: [],
        activeClaims: [],
        freelancers: [],
        pagination: emptyPagination,
      });
    }
    setLoading(false);
  }, [activityPage, claimsPage]);

  useEffect(() => {
    load(1, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 3600);
    return () => clearTimeout(t);
  }, [msg]);

  async function postTip() {
    if (status !== "authenticated") {
      setMsg("登录后才能发协作提示");
      return;
    }
    setPosting(true);
    const res = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: tip }),
    });
    const body = await res.json();
    setPosting(false);
    if (!res.ok) {
      setMsg(body.error || "发送失败");
      return;
    }
    setTip("");
    setMsg("已分享到社区");
    setActivityPage(1);
    await load(1, claimsPage);
  }

  if (!data) return <div className="panel empty soft">加载社区…</div>;

  const aPag = data.pagination.activities;
  const cPag = data.pagination.claims;

  return (
    <div className="community-grid">
      <section className="panel">
        <h2>正在推进的单</h2>
        <p className="hint">看到有人认领，就换一单或先沟通，把灵活就业做成协作而不是内卷。</p>
        <div className={`task-list list-stage ${loading ? "is-loading" : ""}`} style={{ marginTop: "0.8rem" }}>
          {data.activeClaims.length === 0 && (
            <p className="muted">还没有进行中的认领，去大厅接一单吧。</p>
          )}
          {data.activeClaims.map((c, idx) => (
            <article
              key={c.id}
              className="task-card task-card-interactive"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="task-main">
                <div className="task-meta">
                  <Link href={`/u/${c.user.id}`} className="mini-tag">
                    {c.user.name || "伙伴"}
                  </Link>
                  <span className="badge badge-success">
                    {c.status === "submitted" ? "已提交" : "进行中"}
                  </span>
                  {c.task.amountText && (
                    <span className="gold-text amount">{c.task.amountText}</span>
                  )}
                </div>
                <h4>{c.task.title}</h4>
                <p className="muted">{c.task.projectName}</p>
              </div>
              <Link className="btn ghost" href={`/opportunity/${c.task.id}`}>
                看任务
              </Link>
            </article>
          ))}
        </div>
        <PaginationBar
          page={cPag.page}
          totalPages={cPag.totalPages}
          total={cPag.total}
          pageSize={cPag.pageSize}
          disabled={loading}
          label="个进行中"
          onChange={(p) => {
            setClaimsPage(p);
            load(activityPage, p);
          }}
        />
      </section>

      <section className="panel">
        <h2>社区动态</h2>
        <div className="composer">
          <input
            value={tip}
            onChange={(e) => setTip(e.target.value)}
            placeholder="分享坑点、结算经验、或求组队…"
            maxLength={280}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                postTip();
              }
            }}
          />
          <button type="button" className="btn gold" disabled={posting || !tip.trim()} onClick={postTip}>
            {posting ? "发送中…" : "发动态"}
          </button>
        </div>
        {msg && (
          <p className="toast-inline toast-live" role="status">
            {msg}
          </p>
        )}
        <div className={`feed-list list-stage ${loading ? "is-loading" : ""}`}>
          {data.activities.length === 0 && <p className="muted">还没有动态，注册后会出现。</p>}
          {data.activities.map((a, idx) => (
            <div
              key={a.id}
              className="feed-item feed-item-interactive"
              style={{ animationDelay: `${idx * 35}ms` }}
            >
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
              {a.task && (
                <Link href={`/opportunity/${a.task.id}`} className="muted">
                  {a.task.title.slice(0, 60)} →
                </Link>
              )}
            </div>
          ))}
        </div>
        <PaginationBar
          page={aPag.page}
          totalPages={aPag.totalPages}
          total={aPag.total}
          pageSize={aPag.pageSize}
          disabled={loading}
          label="条动态"
          onChange={(p) => {
            setActivityPage(p);
            load(p, claimsPage);
          }}
        />
      </section>

      <section className="panel">
        <h2>灵活就业伙伴</h2>
        <p className="hint">按信誉排序，公开主页方便互相认识、组队或转介任务。</p>
        {data.freelancers.length === 0 ? (
          <div className="human-empty" style={{ marginTop: "0.8rem" }}>
            <strong>伙伴墙还是空的</strong>
            <p>
              {status === "authenticated"
                ? "去工作台完善公开主页与技能，就会出现在这里。"
                : "注册并完善公开主页后，会出现在伙伴墙。"}
            </p>
            <div className="detail-cta-stack" style={{ justifyContent: "flex-start" }}>
              {status === "authenticated" ? (
                <Link href="/dashboard" className="btn primary">
                  完善工作台
                </Link>
              ) : (
                <Link href="/register" className="btn primary">
                  免费注册
                </Link>
              )}
            </div>
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}
