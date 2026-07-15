"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatUsdCents } from "@/lib/matching";
import {
  platformLabel,
  toEmbedUrl,
  type SocialLink,
  type VideoLink,
} from "@/lib/profile-media";
import { GithubProfileEmbed } from "@/components/GithubProfileEmbed";
import { extractGithubUsername } from "@/lib/github-embed";

type Profile = {
  id: string;
  name: string | null;
  headline: string | null;
  bio: string | null;
  aboutLong: string | null;
  socials: SocialLink[];
  videos: VideoLink[];
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

  return (
    <div className="profile-page">
      <section className="panel profile-hero">
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
          {socials.length > 0 && (
            <div className="social-row" style={{ marginTop: "1rem" }}>
              {socials.map((s, i) => (
                <a
                  key={`${s.platform}-${i}`}
                  className="social-chip"
                  href={socialHref(s)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label || platformLabel(s.platform)}
                </a>
              ))}
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
        </div>
      </section>

      {githubLink && <GithubProfileEmbed githubUrl={githubLink.url} />}

      {profile.aboutLong && (
        <section className="panel">
          <h2>完整介绍</h2>
          <div className="about-long">{profile.aboutLong}</div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="panel">
          <h2>自我介绍视频</h2>
          <p className="hint">来自各平台的介绍 / Demo 视频</p>
          <div className="video-grid">
            {videos.map((v, i) => {
              const embed = toEmbedUrl(v.url);
              return (
                <article key={`${v.url}-${i}`} className="video-card">
                  {v.title && <h3>{v.title}</h3>}
                  {embed ? (
                    <div className="video-frame">
                      <iframe
                        src={embed.embedUrl}
                        title={v.title || embed.platform}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <a className="btn ghost" href={v.url} target="_blank" rel="noreferrer">
                      打开视频链接 ↗
                    </a>
                  )}
                  {!embed && <p className="muted tiny">暂不支持内嵌，请点链接观看</p>}
                  {embed && (
                    <a className="muted tiny video-source" href={v.url} target="_blank" rel="noreferrer">
                      在 {embed.platform} 打开 ↗
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>最近在做 / 做过</h2>
        <div className="task-list" style={{ marginTop: "0.8rem" }}>
          {profile.claims.length === 0 && <p className="muted">暂无公开认领记录</p>}
          {profile.claims.map((c) => (
            <article key={c.id} className="task-card">
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
              <a className="btn ghost" href={c.task.url} target="_blank" rel="noreferrer">
                查看 ↗
              </a>
            </article>
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
    </div>
  );
}
