import {
  amountFromSalaryText,
  classifyJobKind,
  isFlexibleRelevant,
  stripHtml,
} from "./job-utils";
import type { NormalizedBounty, SourceFetcher } from "./types";

type RemoteOkJob = {
  id?: string | number;
  slug?: string;
  position?: string;
  company?: string;
  url?: string;
  tags?: string[];
  description?: string;
  salary_min?: number;
  salary_max?: number;
  location?: string;
};

export const remoteOkSource: SourceFetcher = {
  key: "remoteok",
  name: "RemoteOK",
  description: "全球远程岗位公开 API（优先合同/兼职/自由职业标签）",
  async fetch() {
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": "opentacker/0.3 (flexible-work aggregator)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`);
    const rows = (await res.json()) as RemoteOkJob[];
    const items: NormalizedBounty[] = [];

    for (const row of rows) {
      // 首条常为法律声明
      if (!row.id || !row.position) continue;
      const tags = (row.tags || []).map(String);
      const relevant = isFlexibleRelevant({
        title: row.position,
        tags,
        description: row.description,
        remote: true,
      });
      // RemoteOK 本身就是远程岗，全量纳入灵活就业发现；kind 区分兼职
      if (!relevant && !tags.length) continue;

      const kind = classifyJobKind({
        title: row.position,
        tags,
        description: row.description,
      });
      let amountText: string | null = null;
      let amountMin: number | null = null;
      let amountMax: number | null = null;
      if (row.salary_min || row.salary_max) {
        const min = row.salary_min || row.salary_max || 0;
        const max = row.salary_max || row.salary_min || 0;
        amountText = `$${min.toLocaleString()}–$${max.toLocaleString()}/yr`;
        amountMin = Math.round(min * 100);
        amountMax = Math.round(max * 100);
      }

      const url =
        row.url ||
        (row.slug ? `https://remoteok.com/remote-jobs/${row.slug}` : null);
      if (!url) continue;

      items.push({
        externalId: `remoteok:${row.id}`,
        title: row.position,
        url,
        projectName: row.company || "RemoteOK",
        amountText,
        amountMin,
        amountMax,
        currency: "USD",
        techTags: tags.slice(0, 8),
        kind,
        status: "open",
        summary: stripHtml(row.description || "", 280),
        raw: { location: row.location, source: "remoteok" },
      });
    }
    return items.slice(0, 60);
  },
};
