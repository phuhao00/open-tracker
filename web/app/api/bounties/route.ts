import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSources } from "@/lib/sources/sync";
import { parseSkills, scoreTaskForUser } from "@/lib/matching";

const SOURCE_LABEL: Record<string, string> = {
  paid_list: "付费列表",
  github_search: "GitHub",
  algora: "Algora",
};

export async function GET(req: Request) {
  await ensureDefaultSources();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sourceKey = searchParams.get("source") ?? "";
  const sort = searchParams.get("sort") || "match"; // match | amount | newest
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("limit") || 10) || 10, 1), 40);

  const session = await auth();
  let allowedSourceIds: string[] | null = null;
  let userSkills: string[] = [];
  let userGoal = "quick";

  if (session?.user?.id) {
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

  const where = {
    status: "open" as const,
    ...(allowedSourceIds ? { sourceId: { in: allowedSourceIds } } : {}),
    ...(sourceKey
      ? { source: { key: sourceKey } }
      : { source: { enabled: true } }),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { projectName: { contains: q } },
            { summary: { contains: q } },
            { amountText: { contains: q } },
          ],
        }
      : {}),
  };

  // Facets ignore current source filter so pills stay stable while paging
  const facetWhere = {
    status: "open" as const,
    ...(allowedSourceIds ? { sourceId: { in: allowedSourceIds } } : {}),
    source: { enabled: true },
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { projectName: { contains: q } },
            { summary: { contains: q } },
            { amountText: { contains: q } },
          ],
        }
      : {}),
  };

  const [tasks, facetRows] = await Promise.all([
    prisma.bountyTask.findMany({
      where,
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
      take: 500,
    }),
    prisma.bountyTask.findMany({
      where: facetWhere,
      select: { source: { select: { key: true, name: true } } },
      take: 500,
    }),
  ]);

  const sourceCounts = new Map<string, { key: string; name: string; count: number }>();
  for (const row of facetRows) {
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

  const items = tasks.map((t) => {
    const techTags = JSON.parse(t.techTags || "[]") as string[];
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
      matchScore: session?.user ? match.score : null,
      matchReasons: session?.user ? match.reasons : [],
    };
  });

  if (sort === "amount") {
    items.sort((a, b) => (b.amountMax || 0) - (a.amountMax || 0));
  } else if (sort === "newest") {
    items.sort((a, b) => +new Date(b.fetchedAt) - +new Date(a.fetchedAt));
  } else if (session?.user) {
    items.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  } else {
    items.sort((a, b) => (b.amountMax || 0) - (a.amountMax || 0));
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return NextResponse.json({
    page: safePage,
    pageSize,
    total,
    totalPages,
    personalized: Boolean(session?.user),
    facets: {
      sources: [...sourceCounts.values()].sort((a, b) => b.count - a.count),
    },
    items: items.slice(start, start + pageSize),
  });
}
