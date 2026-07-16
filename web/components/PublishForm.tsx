"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EMPLOYMENT_DISCLAIMER, PUBLISH_NOTICE_ZH } from "@/lib/opportunity-policy";

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

export function PublishForm() {
  const { status } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [projectName, setProjectName] = useState("");
  const [url, setUrl] = useState("");
  const [engagementType, setEngagementType] = useState<"project" | "employment">("project");
  const [workKind, setWorkKind] = useState<"opportunity" | "bounty" | "parttime" | "job">(
    "opportunity",
  );
  const [amountText, setAmountText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [regionHint, setRegionHint] = useState<"" | "cn" | "global" | "remote">("remote");
  const [contactMode, setContactMode] = useState<"profile" | "email" | "url">("profile");
  const [contactValue, setContactValue] = useState("");
  const [expireDays, setExpireDays] = useState(30);
  const [techTags, setTechTags] = useState<string[]>([]);
  const [employmentAccepted, setEmploymentAccepted] = useState(false);
  const [acceptedNotice, setAcceptedNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [mine, setMine] = useState<
    Array<{
      id: string;
      title: string;
      moderationStatus: string;
      status: string;
      engagementType: string;
    }>
  >([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/publish");
  }, [status, router]);

  async function loadMine() {
    const res = await fetch("/api/opportunities?mine=1");
    if (!res.ok) return;
    const data = await res.json();
    setMine(data.items || []);
  }

  useEffect(() => {
    if (status === "authenticated") loadMine();
  }, [status]);

  function toggleTag(tag: string) {
    setTechTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 12 ? prev : [...prev, tag],
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!acceptedNotice) {
      setMsgTone("err");
      setMsg("请先阅读并勾选《机会发布须知》");
      return;
    }
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        summary,
        projectName: projectName || undefined,
        url: url || null,
        techTags,
        engagementType,
        workKind: engagementType === "employment" ? workKind === "opportunity" ? "job" : workKind : workKind,
        amountText: amountText || null,
        locationText: locationText || null,
        regionHint: regionHint || undefined,
        contactMode,
        contactValue: contactMode === "profile" ? null : contactValue,
        expireDays,
        employmentAccepted: engagementType === "employment" ? employmentAccepted : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsgTone("err");
      setMsg(data.error || "发布失败");
      return;
    }
    setMsgTone("ok");
    setMsg(data.message || "已发布");
    setTitle("");
    setSummary("");
    setUrl("");
    setAmountText("");
    await loadMine();
  }

  async function closeMine(id: string) {
    const res = await fetch(`/api/opportunities?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMsgTone("ok");
      setMsg("已下架");
      await loadMine();
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return <div className="panel empty soft">加载中…</div>;
  }

  return (
    <div className="publish-page">
      <section className="panel">
        <div className="eyebrow">OPC / 个人友好</div>
        <h1>发布机会</h1>
        <p className="lede">
          以项目协作、外包、悬赏为主。平台仅展示信息，不做职业介绍中介，不向求职者收费。
        </p>
        <pre className="publish-notice">{PUBLISH_NOTICE_ZH}</pre>
        <label className="check-row">
          <input
            type="checkbox"
            checked={acceptedNotice}
            onChange={(e) => setAcceptedNotice(e.target.checked)}
          />
          我已阅读并同意《机会发布须知》
        </label>
      </section>

      <form className="panel" onSubmit={submit}>
        <h2>填写机会</h2>
        <div className="form-grid">
          <label className="full">
            标题
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：需要一位 React 开发帮忙做落地页改版（2 周）"
            />
          </label>
          <label>
            项目 / 主体名称
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="你的 OPC / 产品名"
            />
          </label>
          <label>
            预算说明（可选）
            <input
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="$500 / ¥3000 / 面议"
            />
          </label>
          <label className="full">
            摘要（自写，勿粘贴招聘站全文）
            <textarea
              required
              rows={6}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="做什么、技能要求、交付物、时间安排、协作方式…"
            />
          </label>
          <label>
            机会类型
            <select
              value={engagementType}
              onChange={(e) => setEngagementType(e.target.value as "project" | "employment")}
            >
              <option value="project">项目协作 / 外包 / 悬赏</option>
              <option value="employment">雇佣机会（信息展示）</option>
            </select>
          </label>
          <label>
            细分形态
            <select
              value={workKind}
              onChange={(e) =>
                setWorkKind(e.target.value as "opportunity" | "bounty" | "parttime" | "job")
              }
            >
              <option value="opportunity">协作机会</option>
              <option value="bounty">悬赏单</option>
              <option value="parttime">兼职/灵活</option>
              <option value="job">全职岗位</option>
            </select>
          </label>
          <label>
            地区倾向
            <select
              value={regionHint}
              onChange={(e) => setRegionHint(e.target.value as "" | "cn" | "global" | "remote")}
            >
              <option value="remote">远程优先</option>
              <option value="cn">国内</option>
              <option value="global">海外</option>
              <option value="">不标注</option>
            </select>
          </label>
          <label>
            地点说明（可选）
            <input
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="上海 / UTC+8 / 不限"
            />
          </label>
          <label className="full">
            外链（可选，Issue / Notion / 官网）
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label>
            有效期
            <select
              value={expireDays}
              onChange={(e) => setExpireDays(Number(e.target.value))}
            >
              <option value={14}>14 天</option>
              <option value={30}>30 天</option>
              <option value={60}>60 天</option>
              <option value={90}>90 天</option>
            </select>
          </label>
          <label>
            联系方式
            <select
              value={contactMode}
              onChange={(e) => setContactMode(e.target.value as "profile" | "email" | "url")}
            >
              <option value="profile">公开档案页</option>
              <option value="email">邮箱（登录可见）</option>
              <option value="url">联系链接（登录可见）</option>
            </select>
          </label>
          {contactMode !== "profile" && (
            <label className="full">
              {contactMode === "email" ? "联系邮箱" : "联系链接"}
              <input
                required
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={contactMode === "email" ? "hello@example.com" : "https://..."}
              />
            </label>
          )}
        </div>

        <div className="skill-cloud" style={{ marginTop: "0.9rem" }}>
          {SKILL_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`skill-chip ${techTags.includes(tag) ? "active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        {engagementType === "employment" && (
          <label className="check-row employment-check">
            <input
              type="checkbox"
              checked={employmentAccepted}
              onChange={(e) => setEmploymentAccepted(e.target.checked)}
            />
            <span>{EMPLOYMENT_DISCLAIMER}</span>
          </label>
        )}

        {msg && (
          <p className={`toast-inline ${msgTone === "err" ? "toast-err" : ""}`} role="status">
            {msg}
          </p>
        )}

        <div className="save-profile-row">
          <button type="submit" className="btn gold" disabled={saving}>
            {saving ? "提交中…" : "发布机会"}
          </button>
          <Link href="/" className="btn ghost">
            回大厅
          </Link>
        </div>
      </form>

      <section className="panel">
        <h2>我发布的机会</h2>
        {mine.length === 0 && <p className="muted">还没有发布记录</p>}
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {mine.map((item) => (
            <article key={item.id} className="task-card">
              <div className="task-main">
                <div className="task-meta">
                  <span className="mini-tag">{item.engagementType}</span>
                  <span className="mini-tag">{item.moderationStatus}</span>
                  <span className="mini-tag">{item.status}</span>
                </div>
                <h4>{item.title}</h4>
              </div>
              {(item.status === "open" || item.moderationStatus === "approved") && (
                <button type="button" className="btn ghost" onClick={() => closeMine(item.id)}>
                  下架
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
