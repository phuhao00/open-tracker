import {
  amountFromSalaryText,
  classifyJobKind,
  stripHtml,
} from "./job-utils";
import type { NormalizedBounty, SourceFetcher } from "./types";

type JobicyJob = {
  id: number | string;
  url: string;
  jobTitle: string;
  companyName: string;
  jobType?: string;
  jobGeo?: string;
  jobLevel?: string;
  jobIndustry?: string[];
  jobExcerpt?: string;
  jobDescription?: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
};

export const jobicySource: SourceFetcher = {
  key: "jobicy",
  name: "Jobicy",
  description: "远程/灵活就业公开 API（含 freelance 标签查询）",
  async fetch() {
    const urls = [
      "https://jobicy.com/api/v2/remote-jobs?count=50&tag=freelance",
      "https://jobicy.com/api/v2/remote-jobs?count=50&tag=contract",
      "https://jobicy.com/api/v2/remote-jobs?count=40",
    ];
    const seen = new Set<string>();
    const items: NormalizedBounty[] = [];

    for (const api of urls) {
      const res = await fetch(api, {
        headers: { "User-Agent": "opentacker/0.3" },
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { jobs?: JobicyJob[] };
      for (const job of data.jobs ?? []) {
        const id = String(job.id);
        if (seen.has(id)) continue;
        seen.add(id);
        const tags = [
          ...(job.jobIndustry || []),
          job.jobType,
          job.jobLevel,
          job.jobGeo,
        ].filter(Boolean) as string[];

        let amountText: string | null = null;
        let amountMin: number | null = null;
        let amountMax: number | null = null;
        const currency = job.salaryCurrency || "USD";
        if (job.annualSalaryMin || job.annualSalaryMax) {
          const min = job.annualSalaryMin || job.annualSalaryMax || 0;
          const max = job.annualSalaryMax || job.annualSalaryMin || 0;
          amountText = `${currency} ${min.toLocaleString()}–${max.toLocaleString()}/yr`;
          amountMin = Math.round(min * 100);
          amountMax = Math.round(max * 100);
        } else {
          const parsed = amountFromSalaryText(job.jobExcerpt);
          amountText = parsed.amountText;
          amountMin = parsed.amountMin;
          amountMax = parsed.amountMax;
        }

        items.push({
          externalId: `jobicy:${id}`,
          title: job.jobTitle,
          url: job.url,
          projectName: job.companyName || "Jobicy",
          amountText,
          amountMin,
          amountMax,
          currency,
          techTags: tags.slice(0, 8),
          kind: classifyJobKind({
            title: job.jobTitle,
            jobType: job.jobType,
            tags,
            description: job.jobDescription || job.jobExcerpt,
          }),
          status: "open",
          summary: stripHtml(job.jobExcerpt || job.jobDescription || "", 280),
          raw: { jobType: job.jobType, geo: job.jobGeo },
        });
      }
    }
    return items.slice(0, 60);
  },
};
