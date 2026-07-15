import {
  amountFromSalaryText,
  classifyJobKind,
  stripHtml,
} from "./job-utils";
import type { NormalizedBounty, SourceFetcher } from "./types";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  salary?: string;
  description?: string;
};

export const remotiveSource: SourceFetcher = {
  key: "remotive",
  name: "Remotive",
  description: "远程工作公开 API，筛选兼职/合同/自由职业相关岗位",
  async fetch() {
    const res = await fetch("https://remotive.com/api/remote-jobs", {
      headers: { "User-Agent": "opentacker/0.3" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);
    const data = (await res.json()) as { jobs?: RemotiveJob[] };
    const items: NormalizedBounty[] = [];

    for (const job of data.jobs ?? []) {
      const tags = [...(job.tags || []), job.category, job.job_type].filter(Boolean) as string[];
      const salary = amountFromSalaryText(job.salary);
      items.push({
        externalId: `remotive:${job.id}`,
        title: job.title,
        url: job.url,
        projectName: job.company_name || "Remotive",
        amountText: salary.amountText,
        amountMin: salary.amountMin,
        amountMax: salary.amountMax,
        currency: salary.currency,
        techTags: tags.slice(0, 8),
        kind: classifyJobKind({
          title: job.title,
          jobType: job.job_type,
          tags,
          description: job.description,
        }),
        status: "open",
        summary: stripHtml(job.description || "", 280),
        raw: { job_type: job.job_type, category: job.category },
      });
    }
    return items.slice(0, 60);
  },
};
