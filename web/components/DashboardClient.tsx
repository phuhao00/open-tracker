"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatUsdCents } from "@/lib/matching";
import { PaginationBar } from "@/components/PaginationBar";
import {
  SOCIAL_PLATFORMS,
  type SocialLink,
  type WorkItem,
} from "@/lib/profile-media";

type MeData = {
  id: string;
  name: string | null;
  email: string;
  headline: string | null;
  bio: string | null;
  aboutLong: string | null;
  socials: SocialLink[];
  videos: WorkItem[];
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
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [earnTitle, setEarnTitle] = useState("");
  const [earnAmount, setEarnAmount] = useState("100");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [aboutLong, setAboutLong] = useState("");
  const [city, setCity] = useState("");
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [videos, setVideos] = useState<WorkItem[]>([]);
  const [claimPage, setClaimPage] = useState(1);
  const [earnPage, setEarnPage] = useState(1);
  const CLAIM_PAGE = 5;
  const EARN_PAGE = 5;

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
    setAboutLong(data.aboutLong || "");
    setCity(data.city || "");
    setSocials(Array.isArray(data.socials) ? data.socials : []);
    setVideos(Array.isArray(data.videos) ? data.videos : []);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") refresh();
  }, [status, router]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 4200);
    return () => clearTimeout(t);
  }, [msg]);

  function flash(text: string, tone: "ok" | "err" = "ok") {
    setMsgTone(tone);
    setMsg(text);
  }

  async function saveProfile(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      let body: { error?: string } = {};
      try {
        body = await res.json();
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        flash(body.error || `保存失败（${res.status}）`, "err");
        return;
      }
      flash("档案已保存");
      await refresh();
    } catch {
      flash("网络异常，请稍后重试", "err");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSource(sourceId: string, enabled: boolean) {
    await fetch("/api/me/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, enabled }),
    });
    flash(enabled ? "已启用数据源" : "已关闭数据源");
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
    flash(res.ok ? "同步完成" : data.error || "同步失败（需审核员权限）", res.ok ? "ok" : "err");
    if (res.ok) await refresh();
  }

  async function updateClaim(taskId: string, nextStatus: string) {
    const res = await fetch("/api/claims", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status: nextStatus }),
    });
    flash(res.ok ? "认领状态已更新" : "更新失败", res.ok ? "ok" : "err");
    await refresh();
  }

  async function addEarning() {
    const dollars = Number(earnAmount);
    if (!earnTitle || !Number.isFinite(dollars) || dollars <= 0) {
      flash("请填写收益标题和金额（美元）", "err");
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
      flash("已记录收益，并同步到社区动态");
      await refresh();
    } else {
      flash("记录失败", "err");
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
    return <div className="panel empty soft">加载工作台…</div>;
  }

  const claimTotalPages = Math.max(1, Math.ceil(me.claims.length / CLAIM_PAGE));
  const safeClaimPage = Math.min(claimPage, claimTotalPages);
  const claimSlice = me.claims.slice(
    (safeClaimPage - 1) * CLAIM_PAGE,
    safeClaimPage * CLAIM_PAGE,
  );
  const earnTotalPages = Math.max(1, Math.ceil(me.earnings.length / EARN_PAGE));
  const safeEarnPage = Math.min(earnPage, earnTotalPages);
  const earnSlice = me.earnings.slice(
    (safeEarnPage - 1) * EARN_PAGE,
    safeEarnPage * EARN_PAGE,
  );

  return (
    <div className="dashboard">
      {msg && (
        <p
          className={`dashboard-float-toast toast-live ${msgTone === "err" ? "toast-err" : ""}`}
          role="status"
        >
          {msg}
        </p>
      )}
      <section className="panel">
        <div className="dash-top">
          <div>
            <h2>你好，{me.name || me.email}</h2>
            <p className="hint">
              信誉 {me.reputation} · 自报收益 {formatUsdCents(me.earnedTotalCents)}
            </p>
          </div>
          <div className="hall-actions">
            <Link href={`/u/${me.id}`} className="btn gold profile-jump">
              公开主页 ↗
            </Link>
            <button type="button" className="btn ghost" disabled={syncing} onClick={() => sync()}>
              {syncing ? "同步中…" : "同步外部数据源"}
            </button>
            <Link href="/community" className="btn primary">
              社区协作
            </Link>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>对外档案（全面介绍自己）</h2>
        <p className="hint">
          文字 + 视频 + 社交主页，让招聘方 / 伙伴一眼了解你。保存后可在{" "}
          <Link href={`/u/${me.id}`}>公开主页</Link> 预览。
        </p>
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
            短简介（列表摘要）
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="过往接单经验、擅长栈、沟通方式…"
            />
          </label>
          <label className="full">
            完整自我介绍
            <textarea
              value={aboutLong}
              onChange={(e) => setAboutLong(e.target.value)}
              rows={8}
              placeholder="经历、代表项目、合作方式、可接类型、时段偏好…（最多约 6000 字）"
            />
          </label>
        </div>

        <div className="profile-editor-block">
          <div className="profile-editor-head">
            <h3>社交 / 平台主页</h3>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setSocials((prev) => [...prev, { platform: "github", url: "" }])}
            >
              + 添加链接
            </button>
          </div>
          {socials.length === 0 && <p className="muted">还没有社交链接，添加 GitHub、LinkedIn、B 站等主页。</p>}
          <div className="link-editor-list">
            {socials.map((s, i) => (
              <div key={i} className="link-editor-row">
                <select
                  value={s.platform}
                  onChange={(e) => {
                    const next = [...socials];
                    next[i] = { ...next[i], platform: e.target.value };
                    setSocials(next);
                  }}
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  value={s.url}
                  onChange={(e) => {
                    const next = [...socials];
                    next[i] = { ...next[i], url: e.target.value };
                    setSocials(next);
                  }}
                  placeholder={
                    SOCIAL_PLATFORMS.find((p) => p.id === s.platform)?.placeholder || "https://..."
                  }
                />
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setSocials(socials.filter((_, j) => j !== i))}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-editor-block">
          <div className="profile-editor-head">
            <h3>作品展示（内嵌播放）</h3>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setVideos((prev) => [...prev, { title: "", description: "", url: "" }])}
            >
              + 添加作品
            </button>
          </div>
          <p className="hint">
            粘贴 Bilibili / YouTube / Vimeo / Loom / CodePen / CodeSandbox / Figma
            等作品链接，公开主页会内嵌展示。也可只填标题 + 外链。
          </p>
          {videos.length === 0 && (
            <p className="muted">推荐放代表作、Demo、讲解视频；B 站主页绑定后也会自动拉近期投稿。</p>
          )}
          <div className="link-editor-list">
            {videos.map((v, i) => (
              <div key={i} className="work-editor-block">
                <div className="link-editor-row video-row">
                  <input
                    value={v.title || ""}
                    onChange={(e) => {
                      const next = [...videos];
                      next[i] = { ...next[i], title: e.target.value };
                      setVideos(next);
                    }}
                    placeholder="作品标题"
                  />
                  <input
                    value={v.url}
                    onChange={(e) => {
                      const next = [...videos];
                      next[i] = { ...next[i], url: e.target.value };
                      setVideos(next);
                    }}
                    placeholder="https://www.bilibili.com/video/BVxxxx 或 YouTube 链接"
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setVideos(videos.filter((_, j) => j !== i))}
                  >
                    删除
                  </button>
                </div>
                <textarea
                  value={v.description || ""}
                  onChange={(e) => {
                    const next = [...videos];
                    next[i] = { ...next[i], description: e.target.value };
                    setVideos(next);
                  }}
                  rows={2}
                  placeholder="作品说明（可选）：你做了什么、用到什么技术…"
                />
              </div>
            ))}
          </div>
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
        <div className="save-profile-row">
          <button
            type="button"
            className="btn gold"
            disabled={saving}
            onClick={() =>
              saveProfile({
                headline,
                bio,
                aboutLong: aboutLong || null,
                city,
                socials: socials.filter((s) => s.url.trim()),
                videos: videos.filter((v) => v.url.trim()),
              })
            }
          >
            {saving ? "保存中…" : "保存档案"}
          </button>
          {msg && (
            <p
              className={`toast-inline toast-beside ${msgTone === "err" ? "toast-err" : ""}`}
              role="status"
            >
              {msg}
            </p>
          )}
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
        <h2>我认领的单（防撞车）</h2>
        <p className="hint">推进状态会同步到社区，方便伙伴知道你在忙什么。</p>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {me.claims.length === 0 && <p className="muted">还没有认领，去大厅点「我来接这单」。</p>}
          {claimSlice.map((c) => (
            <article key={c.id} className="task-card task-card-interactive">
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
        <PaginationBar
          page={safeClaimPage}
          totalPages={claimTotalPages}
          total={me.claims.length}
          pageSize={CLAIM_PAGE}
          label="个认领"
          onChange={setClaimPage}
        />
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
          {earnSlice.map((e) => (
            <article key={e.id} className="task-card task-card-interactive">
              <div className="task-main">
                <h4>{e.title}</h4>
                <p className="muted">{new Date(e.earnedAt).toLocaleDateString("zh-CN")}</p>
              </div>
              <span className="gold-text">{formatUsdCents(e.amountCents)}</span>
            </article>
          ))}
        </div>
        <PaginationBar
          page={safeEarnPage}
          totalPages={earnTotalPages}
          total={me.earnings.length}
          pageSize={EARN_PAGE}
          label="笔收益"
          onChange={setEarnPage}
        />
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
