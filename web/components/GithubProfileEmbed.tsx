"use client";

import { useEffect, useState } from "react";

type GithubEmbedPayload = {
  profile: {
    login: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string;
    htmlUrl: string;
    company: string | null;
    location: string | null;
    blog: string | null;
    publicRepos: number;
    followers: number;
    following: number;
  };
  repos: Array<{
    id: number;
    name: string;
    htmlUrl: string;
    description: string | null;
    language: string | null;
    stargazersCount: number;
    forksCount: number;
  }>;
};

export function GithubProfileEmbed({ githubUrl }: { githubUrl: string }) {
  const [data, setData] = useState<GithubEmbedPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/github/embed?url=${encodeURIComponent(githubUrl)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "加载失败");
        return body as GithubEmbedPayload;
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
  }, [githubUrl]);

  if (loading) {
    return (
      <section className="panel github-embed">
        <h2>GitHub</h2>
        <p className="muted">正在加载 GitHub 主页…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="panel github-embed">
        <h2>GitHub</h2>
        <p className="muted">{error || "暂无法嵌入"}</p>
        <a className="btn ghost" href={githubUrl} target="_blank" rel="noreferrer">
          打开 GitHub ↗
        </a>
      </section>
    );
  }

  const { profile, repos } = data;
  const chartUrl = `https://ghchart.rshah.org/155eef/${encodeURIComponent(profile.login)}`;

  return (
    <section className="panel github-embed">
      <div className="github-embed-head">
        <h2>GitHub</h2>
        <a className="btn primary" href={profile.htmlUrl} target="_blank" rel="noreferrer">
          打开 GitHub 主页 ↗
        </a>
      </div>

      <div className="github-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="github-avatar"
          src={profile.avatarUrl}
          alt={profile.login}
          width={72}
          height={72}
        />
        <div className="github-card-main">
          <div className="github-name-row">
            <strong>{profile.name || profile.login}</strong>
            <span className="muted">@{profile.login}</span>
          </div>
          {profile.bio && <p className="github-bio">{profile.bio}</p>}
          <div className="github-meta">
            {profile.location && <span>{profile.location}</span>}
            {profile.company && <span>{profile.company}</span>}
            {profile.blog && (
              <a
                href={profile.blog.startsWith("http") ? profile.blog : `https://${profile.blog}`}
                target="_blank"
                rel="noreferrer"
              >
                网站
              </a>
            )}
          </div>
          <div className="github-stats">
            <span>
              <strong>{profile.publicRepos}</strong> 仓库
            </span>
            <span>
              <strong>{profile.followers}</strong> 关注者
            </span>
            <span>
              <strong>{profile.following}</strong> 正在关注
            </span>
          </div>
        </div>
      </div>

      <div className="github-chart-wrap">
        <p className="hint">贡献热力图</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="github-chart"
          src={chartUrl}
          alt={`${profile.login} contribution chart`}
          loading="lazy"
        />
      </div>

      {repos.length > 0 && (
        <div className="github-repos">
          <h3>最近更新的仓库</h3>
          <div className="github-repo-grid">
            {repos.map((repo) => (
              <a
                key={repo.id}
                className="github-repo-card"
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                <strong>{repo.name}</strong>
                <p>{repo.description || "暂无描述"}</p>
                <div className="github-repo-meta">
                  {repo.language && <span>{repo.language}</span>}
                  <span>★ {repo.stargazersCount}</span>
                  <span>fork {repo.forksCount}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
