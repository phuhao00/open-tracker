import { amountFromText, type NormalizedBounty, type SourceFetcher } from "./types";

type GhIssue = {
  id: number;
  html_url: string;
  title: string;
  body?: string | null;
  labels: Array<{ name: string } | string>;
  repository_url: string;
  state: string;
};

function labelNames(issue: GhIssue) {
  return issue.labels.map((l) => (typeof l === "string" ? l : l.name));
}

export const githubSearchSource: SourceFetcher = {
  key: "github_search",
  name: "GitHub 悬赏搜索",
  description: "搜索带 bounty / paid / reward 标签的开放 Issue（全网）",
  async fetch() {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "opentacker/0.2",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const queries = [
      'label:"bounty" state:open',
      'label:"paid" state:open',
      'label:"algora" state:open',
      '"$250" label:"help wanted" state:open',
    ];

    const seen = new Set<string>();
    const items: NormalizedBounty[] = [];

    for (const q of queries) {
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=30`;
      const res = await fetch(url, { headers, next: { revalidate: 0 } });
      if (res.status === 403 || res.status === 429) {
        throw new Error("GitHub API 限额不足，请在 web/.env 设置 GITHUB_TOKEN");
      }
      if (!res.ok) continue;
      const data = (await res.json()) as { items?: GhIssue[] };
      for (const issue of data.items ?? []) {
        const key = String(issue.id);
        if (seen.has(key)) continue;
        seen.add(key);
        const repoFull = issue.repository_url.replace("https://api.github.com/repos/", "");
        const projectName = repoFull.split("/")[1] ?? repoFull;
        const labels = labelNames(issue);
        const blob = `${issue.title}\n${issue.body ?? ""}`;
        const amount = amountFromText(blob.match(/\$\s*[\d,]+(?:\s*[-–—]\s*\$?\s*[\d,]+)?/)?.[0] ?? null);
        items.push({
          externalId: `gh:${issue.id}`,
          title: issue.title,
          url: issue.html_url,
          projectName,
          repo: repoFull,
          ...amount,
          techTags: labels.slice(0, 8),
          kind: labels.some((l) => /bounty|paid|reward|algora/i.test(l))
            ? "bounty"
            : "opportunity",
          status: issue.state === "open" ? "open" : "closed",
          summary: (issue.body ?? "").slice(0, 280),
          raw: { labels, q },
        });
      }
    }
    return items;
  },
};
