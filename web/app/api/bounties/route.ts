import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SOURCE_LABEL } from "@/lib/source-labels";
import { ensureDefaultSources, ensureUserSources } from "@/lib/sources/sync";
import { parseSkills, scoreTaskForUser } from "@/lib/matching";
import {
  classifyTaxonomy,
  taxonomyLabel,
  type OpportunityBucket,
  type PortalChannel,
  type RegionCode,
  type WorkType,
} from "@/lib/taxonomy";

type RowTax = ReturnType<typeof classifyTaxonomy>;

export async function GET(req: Request) {
  await ensureDefaultSources();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sourceKey = searchParams.get("source") ?? "";
  const kind = searchParams.get("kind")?.trim() ?? "";
  const bucket = (searchParams.get("bucket")?.trim() ?? "") as "" | OpportunityBucket;
  const region = (searchParams.get("region")?.trim() ?? "") as "" | RegionCode;
  const workType = (searchParams.get("workType")?.trim() ?? "") as "" | WorkType;
  const channel = (searchParams.get("channel")?.trim() ?? "") as PortalChannel;
  const sort = searchParams.get("sort") || "match";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("limit") || 10) || 10, 1), 40);

  const session = await auth();
  let allowedSourceIds: string[] | null = null;
  let userSkills: string[] = [];
  let userGoal = "quick";

  if (session?.user?.id) {
    await ensureUserSources(session.user.id);
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        sources: { where: { enabled: true }, select: { sourceId: true } },
      },
    });
    if (user) {
      userSkills = parseSkills(user.skills);
      userGoal = user.goal;
      if (user.sources.length) allowedSourceIds = user.sources.map((l) => l.sourceId);
    }
  }

  const baseWhere = {
    status: "open" as const,
    ...(allowedSourceIds ? { sourceId: { in: allowedSourceIds } } : {}),
    ...(sourceKey
      ? { source: { key: sourceKey } }
      : { source: { enabled: true } }),
    ...(kind ? { kind } : {}),
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

  // 拉取候选集后做分类过滤（标签/摘要派生维度）
  const candidates = await prisma.bountyTask.findMany({
    where: baseWhere,
    include: {
      source: true,
      claims: {
        where: { status: { in: ["working", "submitted"] } },
        select: {
          id: true,
          status: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ fetchedAt: "desc" }],
    take: 800,
  });

  const enriched = candidates.map((t) => {
    const techTags = (() => {
      try {
        const arr = JSON.parse(t.techTags || "[]");
        return Array.isArray(arr) ? arr.map(String) : [];
      } catch {
        return [] as string[];
      }
    })();
    const taxonomy = classifyTaxonomy({
      kind: t.kind,
      sourceKey: t.source.key,
      title: t.title,
      summary: t.summary,
      techTags,
      rawJson: t.rawJson,
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
      activeClaims: t.claims.length,
    });
    return {
      ...t,
      techTags,
      activeClaims: t.claims,
      taxonomy,
      taxonomyLabel: taxonomyLabel(taxonomy),
      matchScore: session?.user ? match.score : null,
      matchReasons: session?.user ? match.reasons : [],
    };
  });

  function passTaxonomy(tax: RowTax) {
    if (bucket && tax.bucket !== bucket) return false;
    if (region && tax.region !== region) return false;
    if (workType && tax.workType !== workType) return false;
    if (channel && tax.channel !== channel) return false;
    return true;
  }

  // 分面：基于搜索词过滤后的全集，忽略其他分类条件，便于切换
  const facetBase = enriched;
  const filtered = enriched.filter((item) => passTaxonomy(item.taxonomy));

  if (sort === "amount") {
    filtered.sort((a, b) => (b.amountMax || 0) - (a.amountMax || 0));
  } else if (sort === "newest") {
    filtered.sort((a, b) => +new Date(b.fetchedAt) - +new Date(a.fetchedAt));
  } else if (session?.user) {
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

  return NextResponse.json({
    page: safePage,
    pageSize,
    total,
    totalPages,
    personalized: Boolean(session?.user),
    applied: { q, source: sourceKey, kind, bucket, region, workType, channel, sort },
    facets: {
      sources: [...sourceCounts.values()].sort((a, b) => b.count - a.count),
      kinds: countBy((r) => r.kind),
      buckets: countBy((r) => r.taxonomy.bucket),
      regions: countBy((r) => r.taxonomy.region),
      workTypes: countBy((r) => r.taxonomy.workType),
      channels: countBy((r) => r.taxonomy.channel || "unknown"),
    },
    items: filtered.slice(start, start + pageSize),
  });
}
