"use client";

import { useMemo, useState } from "react";
import { KIND_COLORS } from "@/lib/colors";
import type { FlatOpportunity } from "@/lib/types";

const ALL = "全部";

export function OpportunityExplorer({
  opportunities,
}: {
  opportunities: FlatOpportunity[];
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(ALL);
  const [project, setProject] = useState(ALL);

  const kinds = useMemo(
    () => [ALL, ...Array.from(new Set(opportunities.map((o) => o.kind_zh)))],
    [opportunities],
  );
  const projects = useMemo(
    () => [ALL, ...Array.from(new Set(opportunities.map((o) => o.project)))],
    [opportunities],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (kind !== ALL && o.kind_zh !== kind) return false;
      if (project !== ALL && o.project !== project) return false;
      if (!q) return true;
      return (
        o.title.toLowerCase().includes(q) ||
        o.project.toLowerCase().includes(q) ||
        o.payment.toLowerCase().includes(q) ||
        o.reasons.join(" ").toLowerCase().includes(q)
      );
    });
  }, [opportunities, query, kind, project]);

  return (
    <section className="panel" style={{ animationDelay: "0.12s" }}>
      <h2>机会浏览器</h2>
      <p className="hint">按类型、项目与关键词筛选，点击标题跳转 GitHub Issue。</p>

      <div className="toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标题 / 项目 / 报酬…"
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select value={project} onChange={(e) => setProject(e.target.value)}>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
          {filtered.length} / {opportunities.length}
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>得分</th>
              <th>类型</th>
              <th>项目</th>
              <th>Issue</th>
              <th>报酬</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.url}>
                <td className="score">{o.score.toFixed(2)}</td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: `${KIND_COLORS[o.kind] ?? "#8B9BB4"}22`,
                      borderColor: `${KIND_COLORS[o.kind] ?? "#8B9BB4"}55`,
                      color: KIND_COLORS[o.kind] ?? "#8B9BB4",
                    }}
                  >
                    {o.kind_zh}
                  </span>
                </td>
                <td>{o.project}</td>
                <td>
                  <a
                    className="title-link"
                    href={o.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {o.title}
                  </a>
                  <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                    {o.reasons.slice(0, 2).join(" · ")}
                  </div>
                </td>
                <td className="muted">{o.payment}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  没有匹配的机会，试试清空筛选。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
