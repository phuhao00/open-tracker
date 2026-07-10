import type { FlatOpportunity, TrackingSnapshot } from "./types";

export function flattenOpportunities(data: TrackingSnapshot): FlatOpportunity[] {
  const rows: FlatOpportunity[] = [];
  for (const project of data.projects) {
    for (const opp of project.opportunities) {
      rows.push({
        ...opp,
        project: project.name,
        tech: project.tech,
      });
    }
  }
  return rows.sort((a, b) => b.score - a.score);
}

export function buildAnalytics(data: TrackingSnapshot) {
  const opportunities = flattenOpportunities(data);

  const byKindMap = new Map<string, { kind: string; kind_zh: string; count: number }>();
  for (const o of opportunities) {
    const cur = byKindMap.get(o.kind) ?? { kind: o.kind, kind_zh: o.kind_zh, count: 0 };
    cur.count += 1;
    byKindMap.set(o.kind, cur);
  }
  const byKind = [...byKindMap.values()].sort((a, b) => b.count - a.count);

  const byProjectMap = new Map<
    string,
    { project: string; count: number; bounty: number; avgScore: number; stars: number }
  >();
  for (const project of data.projects) {
    const ops = project.opportunities;
    const bounty = ops.filter((o) => o.kind === "bounty").length;
    const avgScore =
      ops.length === 0 ? 0 : ops.reduce((s, o) => s + o.score, 0) / ops.length;
    byProjectMap.set(project.name, {
      project: project.name,
      count: ops.length,
      bounty,
      avgScore: Number(avgScore.toFixed(2)),
      stars: project.snapshot?.stars ?? 0,
    });
  }
  const byProject = [...byProjectMap.values()].sort((a, b) => b.count - a.count);

  const topScores = opportunities.slice(0, 12).map((o) => ({
    name: truncate(o.title, 28),
    fullTitle: o.title,
    score: o.score,
    project: o.project,
    kind: o.kind,
    kind_zh: o.kind_zh,
    url: o.url,
  }));

  const stars = data.projects
    .filter((p) => p.snapshot && !p.snapshot.error)
    .map((p) => ({
      project: p.name,
      stars: p.snapshot!.stars,
      openIssues: p.snapshot!.open_issues,
    }))
    .sort((a, b) => b.stars - a.stars);

  const bountyCount = opportunities.filter((o) => o.kind === "bounty").length;
  const avgScore =
    opportunities.length === 0
      ? 0
      : opportunities.reduce((s, o) => s + o.score, 0) / opportunities.length;

  return {
    opportunities,
    byKind,
    byProject,
    topScores,
    stars,
    stats: {
      projects: data.project_count,
      opportunities: opportunities.length,
      bounties: bountyCount,
      avgScore: Number(avgScore.toFixed(2)),
      generatedAt: data.generated_at,
    },
  };
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export type Analytics = ReturnType<typeof buildAnalytics>;
export type { FlatOpportunity };
