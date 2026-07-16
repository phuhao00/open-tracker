import { prisma } from "@/lib/prisma";
import { SOURCE_LABEL } from "@/lib/source-labels";
import { parseSkills, scoreTaskForUser } from "@/lib/matching";
import {
  classifyTaxonomy,
  taxonomyLabel,
  type OpportunityBucket,
  type PortalChannel,
  type RegionCode,
  type WorkType,
} from "@/lib/taxonomy";

export type BountiesListQuery = {
  q?: string;
  sourceKey?: string;
  kind?: string;
  bucket?: "" | OpportunityBucket;
  region?: "" | RegionCode;
  workType?: "" | WorkType;
  channel?: PortalChannel;
  engagementType?: "" | "project" | "employment";
  sort?: string;
  page?: number;
  pageSize?: number;
  userId?: string | null;
};

export type BountyListItem = {
  id: string;
  title: string;
  url: string;
  projectName: string;
  repo: string | null;
  amountText: string | null;
  amountMax: number | null;
  techTags: string[];
  kind: string;
  summary: string | null;
  matchScore: number | null;
  matchReasons: string[];
  taxonomy: ReturnType<typeof classifyTaxonomy>;
  taxonomyLabel: ReturnType<typeof taxonomyLabel>;
  engagementType: string;
  contactMode: string | null;
  contactValue: string | null;
  locationText: string | null;
  publisher: { id: string; name: string | null; headline: string | null } | null;
  activeClaims: Array<{
    id: string;
    status: string;
    user: { id: string; name: string | null };
  }>;
  source: { key: string; name: string };
};

export type BountiesListResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  personalized: boolean;
  applied: {
    q: string;
    source: string;
    kind: string;
    bucket: string;
    region: string;
    workType: string;
    channel: string;
    engagement: string;
    sort: string;
  };
  facets: {
    sources: Array<{ key: string; name: string; count: number }>;
    kinds: Array<{ key: string; count: number }>;
    buckets: Array<{ key: string; count: number }>;
    regions: Array<{ key: string; count: number }>;
    workTypes: Array<{ key: string; count: number }>;
    channels: Array<{ key: string; count: number }>;
  };
  items: BountyListItem[];
};

type RowTax = ReturnType<typeof classifyTaxonomy>;

const CANDIDATE_LIMIT = 500;

function parseTags(raw: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export async function listBounties(input: BountiesListQuery = {}): Promise<BountiesListResult> {
  const q = input.q?.trim() ?? "";
  const sourceKey = input.sourceKey ?? "";
  const kind = input.kind?.trim() ?? "";
  const bucket = (input.bucket ?? "") as "" | OpportunityBucket;
  const region = (input.region ?? "") as "" | RegionCode;
  const workType = (input.workType ?? "") as "" | WorkType;
  const channel = (input.channel ?? "") as PortalChannel;
  const engagementType = (input.engagementType ?? "") as "" | "project" | "employment";
  const sort = input.sort || "match";
  const page = Math.max(1, Number(input.page || 1) || 1);
  const pageSize = Math.min(Math.max(Number(input.pageSize || 10) || 10, 1), 40);
  const userId = input.userId || null;

  let allowedSourceIds: string[] | null = null;
  let userSkills: string[] = [];
  let userGoal = "quick";

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        skills: true,
        goal: true,
        sources: { where: { enabled: true }, select: { sourceId: true } },
      },
    });
    if (user) {
      userSkills = parseSkills(user.skills);
      userGoal = user.goal;
      if (user.sources.length) allowedSourceIds = user.sources.map((l) => l.sourceId);
    }
  }

  const now = new Date();
  const baseWhere = {
    status: "open" as const,
    moderationStatus: "approved" as const,
    AND: [
      {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    ],
    ...(allowedSourceIds ? { sourceId: { in: allowedSourceIds } } : {}),
    ...(sourceKey ? { source: { key: sourceKey } } : { source: { enabled: true } }),
    ...(kind ? { kind } : {}),
    ...(engagementType ? { engagementType } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { projectName: { contains: q } },
            { summary: { contains: q } },
            { amountText: { contains: q } },
            { techTags: { contains: q } },
          ],
        }
      : {}),
  };

  // 轻量候选集：不拉 rawJson / claims 明细，用 _count 做匹配分
  const candidates = await prisma.bountyTask.findMany({
    where: baseWhere,
    select: {
      id: true,
      title: true,
      url: true,
      projectName: true,
      repo: true,
      amountText: true,
      amountMax: true,
      techTags: true,
      kind: true,
      summary: true,
      engagementType: true,
      contactMode: true,
      contactValue: true,
      locationText: true,
      fetchedAt: true,
      source: { select: { key: true, name: true } },
      publisher: { select: { id: true, name: true, headline: true } },
      _count: {
        select: {
          claims: { where: { status: { in: ["working", "submitted"] } } },
        },
      },
    },
    orderBy: [{ fetchedAt: "desc" }],
    take: CANDIDATE_LIMIT,
  });

  const enriched = candidates.map((t) => {
    const techTags = parseTags(t.techTags);
    const taxonomy = classifyTaxonomy({
      kind: t.kind,
      sourceKey: t.source.key,
      title: t.title,
      summary: t.summary,
      techTags,
    });
    const match = scoreTaskForUser({
      skills: userSkills,
      goal: userGoal,
      techTags,
      title: t.title,
      summary: t.summary,
      amountText: t.amountText,
      amountMax: t.amountMax,
      kind: t.kind,
      activeClaims: t._count.claims,
    });
    return {
      id: t.id,
      title: t.title,
      url: t.url,
      projectName: t.projectName,
      repo: t.repo,
      amountText: t.amountText,
      amountMax: t.amountMax,
      techTags,
      kind: t.kind,
      summary: t.summary,
      engagementType: t.engagementType,
      contactMode: t.contactMode,
      contactValue: userId ? t.contactValue : null,
      locationText: t.locationText,
      fetchedAt: t.fetchedAt,
      publisher: t.publisher,
      source: t.source,
      taxonomy,
      taxonomyLabel: taxonomyLabel(taxonomy),
      matchScore: userId ? match.score : null,
      matchReasons: userId ? match.reasons : [],
      claimCount: t._count.claims,
    };
  });

  function passTaxonomy(tax: RowTax) {
    if (bucket && tax.bucket !== bucket) return false;
    if (region && tax.region !== region) return false;
    if (workType && tax.workType !== workType) return false;
    if (channel && tax.channel !== channel) return false;
    return true;
  }

  const facetBase = enriched;
  const filtered = enriched.filter((item) => passTaxonomy(item.taxonomy));

  if (sort === "amount") {
    filtered.sort((a, b) => (b.amountMax || 0) - (a.amountMax || 0));
  } else if (sort === "newest") {
    filtered.sort((a, b) => +new Date(b.fetchedAt) - +new Date(a.fetchedAt));
  } else if (userId) {
    filtered.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  } else {
    filtered.sort((a, b) => (b.amountMax || 0) - (a.amountMax || 0));
  }

  const countBy = <K extends string>(pick: (t: (typeof facetBase)[0]) => K) => {
    const map = new Map<K, number>();
    for (const row of facetBase) {
      const k = pick(row);
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  };

  const sourceCounts = new Map<string, { key: string; name: string; count: number }>();
  for (const row of facetBase) {
    const key = row.source.key;
    const cur = sourceCounts.get(key);
    if (cur) cur.count += 1;
    else
      sourceCounts.set(key, {
        key,
        name: SOURCE_LABEL[key] || row.source.name,
        count: 1,
      });
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  // 仅给当前页补认领明细
  const pageIds = pageRows.map((r) => r.id);
  const claimRows =
    pageIds.length === 0
      ? []
      : await prisma.taskClaim.findMany({
          where: {
            taskId: { in: pageIds },
            status: { in: ["working", "submitted"] },
          },
          select: {
            id: true,
            status: true,
            taskId: true,
            user: { select: { id: true, name: true } },
          },
        });
  const claimsByTask = new Map<string, BountyListItem["activeClaims"]>();
  for (const c of claimRows) {
    const list = claimsByTask.get(c.taskId) || [];
    list.push({ id: c.id, status: c.status, user: c.user });
    claimsByTask.set(c.taskId, list);
  }

  const items: BountyListItem[] = pageRows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    projectName: row.projectName,
    repo: row.repo,
    amountText: row.amountText,
    amountMax: row.amountMax,
    techTags: row.techTags,
    kind: row.kind,
    summary: row.summary,
    matchScore: row.matchScore,
    matchReasons: row.matchReasons,
    taxonomy: row.taxonomy,
    taxonomyLabel: row.taxonomyLabel,
    engagementType: row.engagementType,
    contactMode: row.contactMode,
    contactValue: row.contactValue,
    locationText: row.locationText,
    publisher: row.publisher,
    activeClaims: claimsByTask.get(row.id) || [],
    source: {
      key: row.source.key,
      name: SOURCE_LABEL[row.source.key] || row.source.name,
    },
  }));

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    personalized: Boolean(userId),
    applied: {
      q,
      source: sourceKey,
      kind,
      bucket,
      region,
      workType,
      channel,
      engagement: engagementType,
      sort,
    },
    facets: {
      sources: [...sourceCounts.values()].sort((a, b) => b.count - a.count),
      kinds: countBy((r) => r.kind),
      buckets: countBy((r) => r.taxonomy.bucket),
      regions: countBy((r) => r.taxonomy.region),
      workTypes: countBy((r) => r.taxonomy.workType),
      channels: countBy((r) => r.taxonomy.channel || "unknown"),
    },
    items,
  };
}
