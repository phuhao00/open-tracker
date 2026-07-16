"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PaginationBar } from "@/components/PaginationBar";
import type { BountiesListResult, BountyListItem } from "@/lib/bounties-list";
import { KIND_LABEL, SOURCE_LABEL } from "@/lib/source-labels";
import {
  BUCKET_META,
  CHANNEL_META,
  REGION_META,
  WORK_TYPE_META,
  type OpportunityBucket,
  type PortalChannel,
  type RegionCode,
  type WorkType,
} from "@/lib/taxonomy";

type BountyItem = BountyListItem;

type CountFacet = { key: string; count: number };
type SourceFacet = { key: string; name: string; count: number };

const PAGE_SIZE = 10;

export function BountyHall({ initialData }: { initialData?: BountiesListResult | null }) {
  const { status } = useSession();
  const listRef = useRef<HTMLDivElement>(null);
  const bootSynced = useRef(false);
  const [items, setItems] = useState<BountyItem[]>(initialData?.items ?? []);
  const [facets, setFacets] = useState({
    sources: (initialData?.facets.sources ?? []) as SourceFacet[],
    buckets: (initialData?.facets.buckets ?? []) as CountFacet[],
    regions: (initialData?.facets.regions ?? []) as CountFacet[],
    workTypes: (initialData?.facets.workTypes ?? []) as CountFacet[],
    channels: (initialData?.facets.channels ?? []) as CountFacet[],
  });
  const [personalized, setPersonalized] = useState(Boolean(initialData?.personalized));
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [bucket, setBucket] = useState<"" | OpportunityBucket>("");
  const [region, setRegion] = useState<"" | RegionCode>("");
  const [workType, setWorkType] = useState<"" | WorkType>("");
  const [channel, setChannel] = useState<PortalChannel>("");
  const [engagement, setEngagement] = useState<"" | "project" | "employment">("");
  const [sort, setSort] = useState("match");
  const [page, setPage] = useState(initialData?.page ?? 1);
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 1);
  const [loading, setLoading] = useState(!initialData);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [fadeKey, setFadeKey] = useState(0);

  const applyResult = useCallback((data: BountiesListResult, fallbackPage: number) => {
    setItems(data.items || []);
    setFacets({
      sources: data.facets?.sources || [],
      buckets: data.facets?.buckets || [],
      regions: data.facets?.regions || [],
      workTypes: data.facets?.workTypes || [],
      channels: data.facets?.channels || [],
    });
    setPersonalized(Boolean(data.personalized));
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setPage(data.page || fallbackPage);
    setFadeKey((k) => k + 1);
  }, []);

  const load = useCallback(
    async (opts?: {
      q?: string;
      source?: string;
      bucket?: "" | OpportunityBucket;
      region?: "" | RegionCode;
      workType?: "" | WorkType;
      channel?: PortalChannel;
      engagement?: "" | "project" | "employment";
      sort?: string;
      page?: number;
      scroll?: boolean;
    }) => {
      const next = {
        q: opts?.q ?? q,
        source: opts?.source ?? source,
        bucket: opts?.bucket ?? bucket,
        region: opts?.region ?? region,
        workType: opts?.workType ?? workType,
        channel: opts?.channel ?? channel,
        engagement: opts?.engagement ?? engagement,
        sort: opts?.sort ?? sort,
        page: opts?.page ?? page,
      };

      setLoading(true);
      const params = new URLSearchParams();
      if (next.q) params.set("q", next.q);
      if (next.source) params.set("source", next.source);
      if (next.bucket) params.set("bucket", next.bucket);
      if (next.region) params.set("region", next.region);
      if (next.workType) params.set("workType", next.workType);
      if (next.channel) params.set("channel", next.channel);
      if (next.engagement) params.set("engagement", next.engagement);
      params.set("sort", next.sort);
      params.set("page", String(next.page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/bounties?${params.toString()}`);
      const data = (await res.json()) as BountiesListResult;
      applyResult(data, next.page);
      setLoading(false);

      if (opts?.scroll) {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [q, source, bucket, region, workType, channel, engagement, sort, page, applyResult],
  );

  useEffect(() => {
    if (status === "loading") return;

    // 服务端已灌入首屏数据，且与当前登录态一致时跳过首轮请求
    if (!bootSynced.current && initialData) {
      bootSynced.current = true;
      const matchesSession =
        Boolean(initialData.personalized) === (status === "authenticated");
      if (matchesSession) {
        setLoading(false);
        return;
      }
    }

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
      setMessage("登录后才能手动同步全网机会");
      return;
    }
    setSyncing(true);
    setMessage("正在同步悬赏、岗位与门户入口…");
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setMessage(data.error || "同步失败（普通用户请改用「发布机会」）");
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

  async function reportTask(taskId: string) {
    if (status !== "authenticated") {
      setMessage("登录后才能举报");
      return;
    }
    const reason = window.prompt("举报原因：spam / illegal / misleading / scam / other", "spam");
    if (!reason) return;
    const res = await fetch("/api/opportunities/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, reason }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message || "已举报" : data.error || "举报失败");
  }

  async function saveTask(taskId: string) {
    if (status !== "authenticated") {
      setMessage("登录后才能收藏");
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
      setMessage("登录后才能认领");
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
    setMessage(data.warning || "已认领");
    await load();
  }

  function resetFilters() {
    setSource("");
    setBucket("");
    setRegion("");
    setWorkType("");
    setChannel("");
    setEngagement("");
    setQ("");
    setPage(1);
    load({
      q: "",
      source: "",
      bucket: "",
      region: "",
      workType: "",
      channel: "",
      engagement: "",
      page: 1,
    });
  }

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (bucket) {
      chips.push({
        key: "bucket",
        label: BUCKET_META.find((b) => b.id === bucket)?.label || bucket,
        clear: () => {
          setBucket("");
          setPage(1);
          load({ bucket: "", page: 1 });
        },
      });
    }
    if (region) {
      chips.push({
        key: "region",
        label: REGION_META.find((r) => r.id === region)?.label || region,
        clear: () => {
          setRegion("");
          setPage(1);
          load({ region: "", page: 1 });
        },
      });
    }
    if (workType) {
      chips.push({
        key: "workType",
        label: WORK_TYPE_META.find((w) => w.id === workType)?.label || workType,
        clear: () => {
          setWorkType("");
          setPage(1);
          load({ workType: "", page: 1 });
        },
      });
    }
    if (channel) {
      chips.push({
        key: "channel",
        label: CHANNEL_META.find((c) => c.id === channel)?.label || channel,
        clear: () => {
          setChannel("");
          setPage(1);
          load({ channel: "", page: 1 });
        },
      });
    }
    if (source) {
      chips.push({
        key: "source",
        label: SOURCE_LABEL[source] || source,
        clear: () => {
          setSource("");
          setPage(1);
          load({ source: "", page: 1 });
        },
      });
    }
    if (engagement) {
      chips.push({
        key: "engagement",
        label: engagement === "project" ? "项目协作" : "雇佣信息",
        clear: () => {
          setEngagement("");
          setPage(1);
          load({ engagement: "", page: 1 });
        },
      });
    }
    if (q) {
      chips.push({
        key: "q",
        label: `搜索「${q}」`,
        clear: () => {
          setQ("");
          setPage(1);
          load({ q: "", page: 1 });
        },
      });
    }
    return chips;
  }, [bucket, region, workType, channel, source, q, load]);

  const countMap = (rows: CountFacet[]) =>
    Object.fromEntries(rows.map((r) => [r.key, r.count]));

  const bucketCounts = countMap(facets.buckets);
  const regionCounts = countMap(facets.regions);
  const workCounts = countMap(facets.workTypes);
  const channelCounts = countMap(facets.channels);

  return (
    <section className="hall">
      <div className="panel hall-hero">
        <div>
          <h2>机会分类</h2>
          <p className="hint">先选大类，再在左侧收窄地区与形态。</p>
        </div>
        <div className="hall-actions">
          <Link href="/publish" className="btn gold">
            发布机会
          </Link>
          <button type="button" className="btn ghost" onClick={syncAll} disabled={syncing}>
            {syncing ? "同步中…" : "同步外部源"}
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
        </div>
      </div>

      <div className="bucket-rail" role="tablist" aria-label="机会大类">
        {BUCKET_META.map((b) => {
          const count =
            b.id === ""
              ? facets.buckets.reduce((s, x) => s + x.count, 0)
              : bucketCounts[b.id] || 0;
          return (
            <button
              key={b.id || "all"}
              type="button"
              role="tab"
              aria-selected={bucket === b.id}
              className={`bucket-card ${bucket === b.id ? "active" : ""}`}
              onClick={() => {
                setBucket(b.id);
                // 切到非门户时清掉 channel
                const nextChannel = b.id && b.id !== "portal" ? "" : channel;
                setChannel(nextChannel);
                setPage(1);
                load({ bucket: b.id, channel: nextChannel, page: 1, scroll: true });
              }}
            >
              <strong>{b.label}</strong>
              <span className="bucket-hint">{b.hint}</span>
              <span className="bucket-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="hall-layout">
        <aside className="panel filter-rail" aria-label="精细筛选">
          <div className="filter-block">
            <h3>地区</h3>
            <div className="filter-stack">
              {REGION_META.map((r) => (
                <button
                  key={r.id || "region-all"}
                  type="button"
                  className={`filter-option ${region === r.id ? "active" : ""}`}
                  onClick={() => {
                    setRegion(r.id);
                    setPage(1);
                    load({ region: r.id, page: 1 });
                  }}
                >
                  <span>{r.label}</span>
                  <em>{r.id ? regionCounts[r.id] || 0 : facets.regions.reduce((s, x) => s + x.count, 0)}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <h3>用工形态</h3>
            <div className="filter-stack">
              {WORK_TYPE_META.map((w) => (
                <button
                  key={w.id || "work-all"}
                  type="button"
                  className={`filter-option ${workType === w.id ? "active" : ""}`}
                  onClick={() => {
                    setWorkType(w.id);
                    setPage(1);
                    load({ workType: w.id, page: 1 });
                  }}
                >
                  <span>{w.label}</span>
                  <em>{w.id ? workCounts[w.id] || 0 : facets.workTypes.reduce((s, x) => s + x.count, 0)}</em>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-block">
            <h3>发布性质</h3>
            <div className="filter-stack">
              {(
                [
                  { id: "", label: "全部性质" },
                  { id: "project", label: "项目协作" },
                  { id: "employment", label: "雇佣信息" },
                ] as const
              ).map((e) => (
                <button
                  key={e.id || "engagement-all"}
                  type="button"
                  className={`filter-option ${engagement === e.id ? "active" : ""}`}
                  onClick={() => {
                    setEngagement(e.id);
                    setPage(1);
                    load({ engagement: e.id, page: 1 });
                  }}
                >
                  <span>{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(bucket === "portal" || bucket === "") && (
            <div className="filter-block">
              <h3>入口类型</h3>
              <div className="filter-stack">
                {CHANNEL_META.map((c) => (
                  <button
                    key={c.id || "channel-all"}
                    type="button"
                    className={`filter-option ${channel === c.id ? "active" : ""}`}
                    onClick={() => {
                      setChannel(c.id);
                      if (c.id) setBucket("portal");
                      setPage(1);
                      load({
                        channel: c.id,
                        bucket: c.id ? "portal" : bucket,
                        page: 1,
                      });
                    }}
                  >
                    <span>{c.label}</span>
                    <em>
                      {c.id
                        ? channelCounts[c.id] || 0
                        : (channelCounts.board || 0) + (channelCounts.careers || 0)}
                    </em>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-block">
            <h3>数据源</h3>
            <div className="filter-stack">
              <button
                type="button"
                className={`filter-option ${source === "" ? "active" : ""}`}
                onClick={() => {
                  setSource("");
                  setPage(1);
                  load({ source: "", page: 1 });
                }}
              >
                <span>全部来源</span>
                <em>{facets.sources.reduce((s, x) => s + x.count, 0)}</em>
              </button>
              {facets.sources.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`filter-option ${source === f.key ? "active" : ""}`}
                  onClick={() => {
                    const next = source === f.key ? "" : f.key;
                    setSource(next);
                    setPage(1);
                    load({ source: next, page: 1 });
                  }}
                >
                  <span>{SOURCE_LABEL[f.key] || f.name}</span>
                  <em>{f.count}</em>
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="btn ghost reset-filters" onClick={resetFilters}>
            清除全部筛选
          </button>
        </aside>

        <div className="hall-main">
          <div className="toolbar compact panel sticky-toolbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索职位、公司、技能、门户…"
              aria-label="搜索机会"
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
              <option value="amount">薪酬/金额优先</option>
              <option value="newest">最新收录</option>
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

          <div className="result-meta">
            <p>
              共 <strong>{total}</strong> 条
              {personalized ? " · 已按你的技能排序" : ""}
            </p>
            {activeChips.length > 0 && (
              <div className="active-chips">
                {activeChips.map((c) => (
                  <button key={c.key} type="button" className="chip" onClick={c.clear}>
                    {c.label} ×
                  </button>
                ))}
              </div>
            )}
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
                  <strong>没有符合当前分类的结果</strong>
                  <p>试试切换大类，或清除侧栏筛选项。也可同步最新机会后再看。</p>
                  <button type="button" className="btn primary" onClick={resetFilters}>
                    查看全部机会
                  </button>
                </div>
              )}
              {items.map((item) => (
                <article
                  key={item.id}
                  className="task-card task-card-interactive"
                >
                  <div className="task-main">
                    <div className="task-meta">
                      <span className="mini-tag">
                        {SOURCE_LABEL[item.source.key] || item.source.name}
                      </span>
                      <span className="badge badge-accent">
                        {item.taxonomyLabel?.bucket || KIND_LABEL[item.kind] || item.kind}
                      </span>
                      <span className="badge badge-success">{item.taxonomyLabel?.region}</span>
                      {item.taxonomyLabel?.work && item.taxonomy.workType !== "other" && (
                        <span className="mini-tag">{item.taxonomyLabel.work}</span>
                      )}
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
                      {item.locationText ? ` · ${item.locationText}` : ""}
                      {item.summary ? ` · ${item.summary.slice(0, 90)}` : ""}
                    </p>
                    {item.publisher && (
                      <p className="claim-hint">
                        发布者：
                        <Link href={`/u/${item.publisher.id}`}>
                          {item.publisher.name || "伙伴"}
                        </Link>
                        {item.engagementType === "employment"
                          ? " · 雇佣信息（非中介）"
                          : item.source.key === "community"
                            ? " · 社区协作"
                            : ""}
                        {item.contactMode === "profile" && " · 联系见档案"}
                        {item.contactValue &&
                          ` · 联系：${item.contactValue}`}
                      </p>
                    )}
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
                    {item.kind !== "portal" && (
                      <button
                        type="button"
                        className="btn gold claim"
                        disabled={busyId === item.id}
                        onClick={() => claimTask(item.id)}
                      >
                        {busyId === item.id ? "处理中…" : "我想接这单"}
                      </button>
                    )}
                    <a
                      className="btn primary"
                      href={item.url.startsWith("/") ? item.url : item.url}
                      target={item.url.startsWith("/") ? undefined : "_blank"}
                      rel={item.url.startsWith("/") ? undefined : "noreferrer"}
                    >
                      {item.kind === "portal"
                        ? "进入招聘入口 ↗"
                        : item.source.key === "community"
                          ? "查看详情"
                          : "打开详情 ↗"}
                    </a>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busyId === item.id}
                      onClick={() => saveTask(item.id)}
                    >
                      ☆ 收藏
                    </button>
                    {item.source.key === "community" && (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => reportTask(item.id)}
                      >
                        举报
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={(next) => {
                setPage(next);
                load({ page: next, scroll: true });
              }}
              disabled={loading || syncing}
              label="条机会"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
