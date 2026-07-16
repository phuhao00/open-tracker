"use client";

import { useEffect, useState } from "react";
import { formatBilibiliCount } from "@/lib/profile-media";

type BilibiliEmbedPayload = {
  profile: {
    mid: string;
    name: string;
    face: string;
    sign: string | null;
    fans: number;
    following: number;
    level: number | null;
    htmlUrl: string;
  };
  videos: Array<{
    bvid: string;
    title: string;
    play: number;
    length: string;
    htmlUrl: string;
  }>;
};

export function BilibiliProfileEmbed({ bilibiliUrl }: { bilibiliUrl: string }) {
  const [data, setData] = useState<BilibiliEmbedPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/bilibili/embed?url=${encodeURIComponent(bilibiliUrl)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "加载失败");
        return body as BilibiliEmbedPayload;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bilibiliUrl]);

  if (loading) {
    return (
      <section className="panel github-embed bilibili-embed">
        <h2>Bilibili 作品</h2>
        <p className="muted">正在加载作品…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="panel github-embed bilibili-embed">
        <h2>Bilibili 作品</h2>
        <p className="muted">{error || "暂无法嵌入"}</p>
        <p className="hint">请填写类似 https://space.bilibili.com/123456 的主页链接</p>
        <a className="btn ghost" href={bilibiliUrl} target="_blank" rel="noreferrer">
          打开 B 站 ↗
        </a>
      </section>
    );
  }

  const { profile, videos } = data;

  return (
    <section className="panel github-embed bilibili-embed">
      <div className="github-embed-head">
        <h2>Bilibili 作品</h2>
        <a className="btn primary" href={profile.htmlUrl} target="_blank" rel="noreferrer">
          打开 B 站主页 ↗
        </a>
      </div>

      <div className="github-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="github-avatar"
          src={profile.face}
          alt={profile.name}
          width={72}
          height={72}
          referrerPolicy="no-referrer"
        />
        <div className="github-card-main">
          <div className="github-name-row">
            <strong>{profile.name}</strong>
            <span className="muted">UID {profile.mid}</span>
            {profile.level != null && <span className="mini-tag">Lv.{profile.level}</span>}
          </div>
          {profile.sign && <p className="github-bio">{profile.sign}</p>}
          <div className="github-stats">
            <span>
              <strong>{formatBilibiliCount(profile.fans)}</strong> 粉丝
            </span>
            <span>
              <strong>{formatBilibiliCount(profile.following)}</strong> 关注
            </span>
            <span>
              <strong>{videos.length}</strong> 近期作品
            </span>
          </div>
        </div>
      </div>

      {videos.length > 0 ? (
        <div className="bilibili-works">
          <h3>近期投稿（内嵌播放）</h3>
          <div className="works-grid bilibili-works-grid">
            {videos.map((v) => (
              <article key={v.bvid} className="work-card">
                <div className="work-card-head">
                  <h3>{v.title}</h3>
                  <span className="mini-tag">bilibili</span>
                </div>
                <div className="video-frame work-frame">
                  <iframe
                    src={`https://player.bilibili.com/player.html?bvid=${v.bvid}&high_quality=1&autoplay=0&danmaku=0`}
                    title={v.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="github-repo-meta" style={{ marginTop: "0.45rem" }}>
                  {v.length && <span>{v.length}</span>}
                  <span>{formatBilibiliCount(v.play)} 播放</span>
                  <a className="muted tiny" href={v.htmlUrl} target="_blank" rel="noreferrer">
                    原页 ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: "1rem" }}>
          该账号暂无公开投稿可展示
        </p>
      )}
    </section>
  );
}
