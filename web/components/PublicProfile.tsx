"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUsdCents } from "@/lib/matching";
import {
  platformLabel,
  extractGithubUsername,
  extractBilibiliMid,
  type SocialLink,
  type WorkItem,
} from "@/lib/profile-media";
import { GithubProfileEmbed } from "@/components/GithubProfileEmbed";
import { BilibiliProfileEmbed } from "@/components/BilibiliProfileEmbed";
import { WorksGallery } from "@/components/WorksGallery";

type Profile = {
  id: string;
  name: string | null;
  headline: string | null;
  bio: string | null;
  aboutLong: string | null;
  socials: SocialLink[];
  videos: WorkItem[];
  skills: string[];
  goal: string;
  availableHours: string;
  city: string | null;
  reputation: number;
  earnedTotalCents: number;
  createdAt: string;
  claims: Array<{
    id: string;
    status: string;
    task: { title: string; url: string; amountText: string | null; projectName: string };
  }>;
  earnings: Array<{
    id: string;
    title: string;
    amountCents: number;
    projectName: string | null;
    earnedAt: string;
  }>;
  _count: { claims: number; earnings: number; shortlists: number };
};

const HOURS: Record<string, string> = {
  fulltime: "接近全职投入",
  parttime: "兼职可接",
  weekends: "周末可接",
  flexible: "时间灵活",
};

function socialHref(s: SocialLink) {
  if (s.platform === "email" && s.url.includes("@") && !s.url.startsWith("http")) {
    return `mailto:${s.url}`;
  }
  return s.url;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PublicProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/profile/${userId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "加载失败");
        return r.json();
      })
      .then(setProfile)
      .catch((e) => setError(e.message));
  }, [userId]);

  if (error) {
    return (
      <div className="panel human-empty">
        <strong>{error}</strong>
        <p>
          <Link href="/community">回社区看看其他伙伴</Link>
        </p>
      </div>
    );
  }
  if (!profile) return <div className="panel empty">加载主页…</div>;

  const socials = profile.socials || [];
  const videos = profile.videos || [];
  const githubLink =
    socials.find((s) => s.platform === "github" && extractGithubUsername(s.url)) ||
    socials.find((s) => extractGithubUsername(s.url));
  const bilibiliLink =
    socials.find((s) => s.platform === "bilibili" && extractBilibiliMid(s.url)) ||
    socials.find((s) => extractBilibiliMid(s.url));
  const primaryContact =
    socials.find((s) => s.platform === "email") ||
    socials.find((s) => s.platform === "website") ||
    socials[0];

  const jumpItems = [
    videos.length > 0 ? { id: "profile-works", label: "作品" } : null,
    githubLink ? { id: "profile-github", label: "GitHub" } : null,
    bilibiliLink ? { id: "profile-bilibili", label: "B 站" } : null,
    profile.aboutLong ? { id: "profile-about", label: "介绍" } : null,
    { id: "profile-claims", label: "经历" },
  ].filter(Boolean) as Array<{ id: string; label: string }>;

  return (
    <div className="profile-page">
      <section className="panel profile-hero profile-hero-spotlight">
        <div>
          <div className="eyebrow">灵活就业伙伴</div>
          <h1>{profile.name || "未命名伙伴"}</h1>
          <p className="lede" style={{ marginTop: "0.4rem" }}>
            {profile.headline || "开源悬赏 · 灵活接单"}
          </p>
          {profile.bio && <p className="detail-summary">{profile.bio}</p>}
          <div className="pick-tags" style={{ marginTop: "0.8rem" }}>
            {profile.skills.map((s) => (
              <span key={s} className="mini-tag">
                {s}
              </span>
            ))}
          </div>

          <div className="profile-cta-row">
            {videos.length > 0 && (
              <button type="button" className="btn gold profile-cta-main" onClick={() => scrollToId("profile-works")}>
                看作品展示
              </button>
            )}
            {primaryContact && (
              <a
                className="btn primary profile-cta-main"
                href={socialHref(primaryContact)}
                target="_blank"
                rel="noreferrer"
              >
                联系 {platformLabel(primaryContact.platform)} ↗
              </a>
            )}
            {githubLink && (
              <a className="btn ghost" href={githubLink.url} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            )}
            {bilibiliLink && (
              <a className="btn ghost" href={bilibiliLink.url} target="_blank" rel="noreferrer">
                B 站主页 ↗
              </a>
            )}
          </div>

          {socials.length > 0 && (
            <div className="social-actions">
              <p className="social-actions-label">社交与主页 · 点击直达</p>
              <div className="social-row social-row-loud">
                {socials.map((s, i) => (
                  <a
                    key={`${s.platform}-${i}`}
                    className={`social-chip social-chip-loud platform-${s.platform}`}
                    href={socialHref(s)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="social-chip-name">{s.label || platformLabel(s.platform)}</span>
                    <span className="social-chip-go">打开 ↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="profile-stats">
          <div className="stat">
            <div className="label">信誉</div>
            <div className="value mint">{profile.reputation}</div>
          </div>
          <div className="stat">
            <div className="label">认领过</div>
            <div className="value">{profile._count.claims}</div>
          </div>
          <div className="stat">
            <div className="label">自报收益</div>
            <div className="value gold">{formatUsdCents(profile.earnedTotalCents)}</div>
          </div>
          <p className="muted">
            {HOURS[profile.availableHours] || profile.availableHours}
            {profile.city ? ` · ${profile.city}` : ""}
          </p>
          {jumpItems.length > 0 && (
            <div className="profile-jump">
              <p className="social-actions-label">快速定位</p>
              <div className="profile-jump-row">
                {jumpItems.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    className="profile-jump-chip"
                    onClick={() => scrollToId(j.id)}
                  >
                    {j.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {githubLink && (
        <div id="profile-github">
          <GithubProfileEmbed githubUrl={githubLink.url} />
        </div>
      )}
      {bilibiliLink && (
        <div id="profile-bilibili">
          <BilibiliProfileEmbed bilibiliUrl={bilibiliLink.url} />
        </div>
      )}

      <div id="profile-works">
        <WorksGallery works={videos} />
      </div>

      {profile.aboutLong && (
        <section className="panel" id="profile-about">
          <h2>完整介绍</h2>
          <div className="about-long">{profile.aboutLong}</div>
        </section>
      )}

      <section className="panel" id="profile-claims">
        <h2>最近在做 / 做过</h2>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {profile.claims.length === 0 && <p className="muted">暂无公开认领记录</p>}
          {profile.claims.map((c) => (
            <a
              key={c.id}
              className="task-card task-card-link"
              href={c.task.url}
              target="_blank"
              rel="noreferrer"
            >
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
              <span className="btn primary">查看详情 ↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>收益记录（自报）</h2>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {profile.earnings.length === 0 && <p className="muted">暂无公开收益</p>}
          {profile.earnings.map((e) => (
            <article key={e.id} className="task-card">
              <div className="task-main">
                <h4>{e.title}</h4>
                <p className="muted">
                  {e.projectName || "项目"} · {new Date(e.earnedAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <span className="gold-text">{formatUsdCents(e.amountCents)}</span>
            </article>
          ))}
        </div>
      </section>

      <div className="profile-sticky-bar" role="navigation" aria-label="快捷操作">
        {videos.length > 0 && (
          <button type="button" className="btn gold" onClick={() => scrollToId("profile-works")}>
            作品
          </button>
        )}
        {primaryContact && (
          <a className="btn primary" href={socialHref(primaryContact)} target="_blank" rel="noreferrer">
            联系 ↗
          </a>
        )}
        {githubLink && (
          <a className="btn ghost" href={githubLink.url} target="_blank" rel="noreferrer">
            GitHub
          </a>
        )}
        {bilibiliLink && (
          <a className="btn ghost" href={bilibiliLink.url} target="_blank" rel="noreferrer">
            B站
          </a>
        )}
        <Link href="/community" className="btn ghost">
          社区
        </Link>
      </div>
    </div>
  );
}
