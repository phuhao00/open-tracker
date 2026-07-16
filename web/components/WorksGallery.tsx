"use client";

import { toEmbedUrl, type WorkItem } from "@/lib/profile-media";

function WorkCard({ work }: { work: WorkItem }) {
  const embed = toEmbedUrl(work.url);

  return (
    <article className="work-card">
      <div className="work-card-head">
        <h3>{work.title?.trim() || (embed ? `${embed.platform} 作品` : "作品")}</h3>
        {embed && <span className="mini-tag">{embed.platform}</span>}
      </div>
      {work.description?.trim() && <p className="work-desc">{work.description.trim()}</p>}

      {embed ? (
        <div className="video-frame work-frame">
          <iframe
            src={embed.embedUrl}
            title={work.title || embed.platform}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="work-fallback">
          <p className="muted">此链接暂不支持内嵌播放，可在新标签打开作品。</p>
          <a className="btn gold" href={work.url} target="_blank" rel="noreferrer">
            打开作品 ↗
          </a>
        </div>
      )}

      <a className="btn ghost work-open-btn" href={work.url} target="_blank" rel="noreferrer">
        在原平台打开 ↗
      </a>
    </article>
  );
}

export function WorksGallery({ works }: { works: WorkItem[] }) {
  if (!works.length) return null;

  return (
    <section className="panel works-gallery">
      <div className="github-embed-head">
        <div>
          <h2>作品展示</h2>
          <p className="hint" style={{ marginTop: "0.25rem" }}>
            可直接在页面内观看 / 预览
          </p>
        </div>
        <a className="btn primary" href={works[0].url} target="_blank" rel="noreferrer">
          打开首个作品 ↗
        </a>
      </div>
      <div className="works-grid">
        {works.map((w, i) => (
          <WorkCard key={`${w.url}-${i}`} work={w} />
        ))}
      </div>
    </section>
  );
}
