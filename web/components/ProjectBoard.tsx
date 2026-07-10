import type { ProjectRecord } from "@/lib/types";

export function ProjectBoard({ projects }: { projects: ProjectRecord[] }) {
  const sorted = [...projects].sort(
    (a, b) => b.opportunities.length - a.opportunities.length,
  );

  return (
    <section className="panel" style={{ animationDelay: "0.18s" }}>
      <h2>项目进展板</h2>
      <p className="hint">按机会数量排序，含 stars、技术栈与报酬说明。</p>
      <div className="project-list">
        {sorted.map((p) => (
          <a
            key={p.name}
            className="project-item"
            href={p.github ? `https://github.com/${p.github}` : p.link}
            target="_blank"
            rel="noreferrer"
          >
            <div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <p>
                {p.tech.join(" · ") || "未知技术栈"}
                {p.snapshot?.language ? ` · 主语言 ${p.snapshot.language}` : ""}
              </p>
            </div>
            <div className="project-meta">
              <strong>{p.opportunities.length} 机会</strong>
              <span>
                ⭐ {p.snapshot?.stars ?? "—"} · issues {p.snapshot?.open_issues ?? "—"}
              </span>
              <span>{p.payment}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
