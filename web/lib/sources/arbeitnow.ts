import { classifyJobKind, isFlexibleRelevant, stripHtml } from "./job-utils";
import type { NormalizedBounty, SourceFetcher } from "./types";

type ArbeitnowJob = {
  slug: string;
  title: string;
  company_name: string;
  remote?: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  description?: string;
  location?: string;
};

export const arbeitnowSource: SourceFetcher = {
  key: "arbeitnow",
  name: "Arbeitnow",
  description: "欧洲科技岗位公开 API，筛选远程与合同/兼职类型",
  async fetch() {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { "User-Agent": "opentacker/0.3" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Arbeitnow HTTP ${res.status}`);
    const data = (await res.json()) as { data?: ArbeitnowJob[] };
    const items: NormalizedBounty[] = [];

    for (const job of data.data ?? []) {
      const tags = [...(job.tags || []), ...(job.job_types || [])];
      const jobType = (job.job_types || []).join(" ");
      if (
        !isFlexibleRelevant({
          title: job.title,
          jobType,
          tags,
          description: job.description,
          remote: Boolean(job.remote),
        })
      ) {
        continue;
      }

      items.push({
        externalId: `arbeitnow:${job.slug}`,
        title: job.title,
        url: job.url,
        projectName: job.company_name || "Arbeitnow",
        techTags: tags.slice(0, 8),
        kind: classifyJobKind({
          title: job.title,
          jobType,
          tags,
          description: job.description,
        }),
        status: "open",
        summary: stripHtml(job.description || "", 280),
        raw: { location: job.location, remote: job.remote },
      });
    }
    return items.slice(0, 50);
  },
};
