import { amountFromText, type NormalizedBounty, type SourceFetcher } from "./types";

/** 常见在 Algora 发 bounty 的组织（可在数据源配置里扩展） */
const DEFAULT_ORGS = [
  "tscircuit",
  "cal",
  "calcom",
  "triggerdotdev",
  "supabase",
  "twentyhq",
  "algora-io",
];

type AlgoraItem = {
  id?: string;
  title?: string;
  url?: string;
  html_url?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  repo_owner?: string;
  repo_name?: string;
  issue_url?: string;
  tech?: string[];
};

async function fetchOrgBounties(org: string): Promise<NormalizedBounty[]> {
  const endpoints = [
    `https://console.algora.io/api/orgs/${org}/bounties?limit=50`,
    `https://algora.io/api/orgs/${org}/bounties?limit=50`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json", "User-Agent": "opentacker/0.2" },
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list: AlgoraItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.bounties)
            ? data.bounties
            : [];
      return list.map((item, idx) => {
        const amountNum =
          typeof item.amount === "number"
            ? item.amount
            : typeof item.amount === "string"
              ? Number(item.amount.replace(/[^\d.]/g, ""))
              : NaN;
        const cents = Number.isFinite(amountNum)
          ? Math.round(amountNum > 1000 && amountNum % 1 === 0 && amountNum > 10000 ? amountNum : amountNum * 100)
          : null;
        // Algora amount often already in cents or dollars — normalize heuristically
        const normalizedCents =
          cents == null
            ? null
            : amountNum >= 1000 && Number.isInteger(amountNum)
              ? Math.round(amountNum) // already cents-ish large
              : Math.round(amountNum * 100);

        const amountText =
          item.amount != null
            ? typeof item.amount === "number"
              ? `$${normalizedCents && normalizedCents >= 100 ? (normalizedCents / 100).toFixed(0) : amountNum}`
              : String(item.amount)
            : null;

        const parsed = amountFromText(amountText);
        const repo =
          item.repo_owner && item.repo_name
            ? `${item.repo_owner}/${item.repo_name}`
            : null;
        return {
          externalId: `algora:${org}:${item.id ?? idx}`,
          title: item.title ?? `${org} bounty`,
          url: item.issue_url || item.html_url || item.url || `https://algora.io/${org}/bounties`,
          projectName: item.repo_name || org,
          repo,
          amountText: parsed.amountText ?? amountText,
          amountMin: parsed.amountMin ?? normalizedCents,
          amountMax: parsed.amountMax ?? normalizedCents,
          currency: item.currency ?? "USD",
          techTags: item.tech ?? [],
          kind: "bounty",
          status: item.status === "active" || !item.status ? "open" : String(item.status),
          summary: `Algora · ${org}`,
          raw: item,
        } satisfies NormalizedBounty;
      });
    } catch {
      // try next endpoint
    }
  }
  return [];
}

export const algoraSource: SourceFetcher = {
  key: "algora",
  name: "Algora 悬赏",
  description: "从 Algora 公开组织接口拉取活跃 bounty",
  async fetch() {
    const results: NormalizedBounty[] = [];
    for (const org of DEFAULT_ORGS) {
      const items = await fetchOrgBounties(org);
      results.push(...items);
    }
    return results;
  },
};
