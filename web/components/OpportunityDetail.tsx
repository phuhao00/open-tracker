"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ReportDialog } from "@/components/ReportDialog";
import { KIND_LABEL, SOURCE_LABEL } from "@/lib/source-labels";
import { clarityLabel, coachTipsForTask } from "@/lib/task-coach";

export type OpportunityDetailData = {
  id: string;
  title: string;
  url: string;
  projectName: string;
  repo: string | null;
  amountText: string | null;
  amountMax: number | null;
  currency: string;
  techTags: string[];
  kind: string;
  summary: string | null;
  engagementType: string;
  contactMode: string | null;
  contactValue: string | null;
  locationText: string | null;
  moderationStatus: string;
  expiresAt: string | null;
  source: { key: string; name: string };
  publisher: {
    id: string;
    name: string | null;
    headline: string | null;
    reputation: number;
  } | null;
  activeClaims: Array<{
    id: string;
    status: string;
    user: { id: string; name: string | null };
  }>;
  taxonomyLabel?: { bucket: string; region: string; work: string };
};

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function OpportunityDetail({ data }: { data: OpportunityDetailData }) {
  const { status } = useSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const tips = coachTipsForTask({
    kind: data.kind,
    source: data.source,
    amountText: data.amountText,
    amountMax: data.amountMax,
    engagementType: data.engagementType,
  });
  const clarity = clarityLabel(tips.clarity);
  const external = isExternalUrl(data.url);
  const canClaim = data.kind !== "portal";

  async function claim() {
    if (status !== "authenticated") {
      setMessage("登录后才能认领");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: data.id }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    setMessage(res.ok ? "已认领，加油推进" : body.error || "认领失败");
  }

  async function save() {
    if (status !== "authenticated") {
      setMessage("登录后才能收藏");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/me/shortlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: data.id }),
    });
    setBusy(false);
    setMessage(res.ok ? "已加入短名单" : "收藏失败");
  }

  function openReport() {
    if (status !== "authenticated") {
      setMessage("登录后才能举报");
      return;
    }
    setReportOpen(true);
  }

  return (
    <article className="opportunity-detail panel">
      <div className="detail-head">
        <div>
          <div className="pick-tags">
            <span className="mini-tag">{SOURCE_LABEL[data.source.key] || data.source.name}</span>
            <span className="mini-tag">{KIND_LABEL[data.kind] || data.kind}</span>
            <span className={`clarity-pill ${clarity.tone}`}>{clarity.text}</span>
            {data.locationText && <span className="mini-tag">{data.locationText}</span>}
          </div>
          <h1>{data.title}</h1>
          <p className="lede" style={{ margin: "0.35rem 0 0", fontSize: "1rem" }}>
            {data.projectName}
            {data.amountText ? ` · ${data.amountText}` : ""}
            {data.amountText ? "" : data.amountMax ? ` · 约 $${(data.amountMax / 100).toLocaleString()}` : ""}
          </p>
        </div>
      </div>

      {data.taxonomyLabel && (
        <p className="hint">
          {data.taxonomyLabel.bucket} · {data.taxonomyLabel.region} · {data.taxonomyLabel.work}
        </p>
      )}

      {data.summary && (
        <section className="detail-body">
          <h2>机会说明</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{data.summary}</p>
        </section>
      )}

      <section className="coach-block">
        <strong>结算提示</strong>
        <p>{tips.settlement}</p>
      </section>
      <section className="coach-block">
        <strong>怎么上手</strong>
        <p>{tips.howTo}</p>
      </section>

      {data.techTags.length > 0 && (
        <div className="pick-tags" style={{ marginTop: "0.75rem" }}>
          {data.techTags.map((t) => (
            <span key={t} className="mini-tag">
              {t}
            </span>
          ))}
        </div>
      )}

      {data.publisher && (
        <section className="detail-publisher">
          <h2>发布者</h2>
          <Link href={`/u/${data.publisher.id}`} className="person-card" style={{ display: "block" }}>
            <strong>{data.publisher.name || "未命名"}</strong>
            <span className="muted">{data.publisher.headline || "灵活就业伙伴"}</span>
            <span className="muted">信誉 {data.publisher.reputation}</span>
          </Link>
          {data.contactMode === "email" && data.contactValue && (
            <p className="hint">
              联系邮箱：{" "}
              <a href={`mailto:${data.contactValue}`}>{data.contactValue}</a>
            </p>
          )}
          {data.contactMode === "url" && data.contactValue && (
            <p className="hint">
              联系链接：{" "}
              <a href={data.contactValue} target="_blank" rel="noreferrer">
                {data.contactValue}
              </a>
            </p>
          )}
          {data.contactMode === "profile" && (
            <p className="hint">通过发布者公开主页联系。</p>
          )}
        </section>
      )}

      {data.activeClaims.length > 0 && (
        <section>
          <h2>正在推进（{data.activeClaims.length}）</h2>
          <ul className="claim-list">
            {data.activeClaims.map((c) => (
              <li key={c.id}>
                <Link href={`/u/${c.user.id}`}>{c.user.name || "伙伴"}</Link>
                <span className="mini-tag">{c.status === "submitted" ? "已提交" : "进行中"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {message && (
        <p className="toast-inline toast-live" role="status">
          {message}
        </p>
      )}

      <div className="detail-cta-stack opportunity-actions">
        {canClaim && (
          <button type="button" className="btn gold" disabled={busy} onClick={claim}>
            {busy ? "处理中…" : "我想接这单"}
          </button>
        )}
        {external && (
          <a className="btn primary" href={data.url} target="_blank" rel="noreferrer">
            {data.kind === "portal" ? "进入招聘入口 ↗" : "打开源站 ↗"}
          </a>
        )}
        <button type="button" className="btn ghost" disabled={busy} onClick={save}>
          ☆ 收藏
        </button>
        {data.source.key === "community" && (
          <button type="button" className="btn ghost" onClick={openReport}>
            举报
          </button>
        )}
        <Link href="/" className="btn ghost">
          返回大厅
        </Link>
      </div>

      <ReportDialog
        open={reportOpen}
        taskId={data.id}
        onClose={() => setReportOpen(false)}
        onDone={(msg) => setMessage(msg)}
      />
    </article>
  );
}
