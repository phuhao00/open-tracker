import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSources } from "@/lib/sources/sync";
import { parseSkills, scoreTaskForUser } from "@/lib/matching";

export async function GET(req: Request) {
  await ensureDefaultSources();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sourceKey = searchParams.get("source") ?? "";
  const sort = searchParams.get("sort") || "match"; // match | amount | newest
  const take = Math.min(Number(searchParams.get("limit") || 60), 100);

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

  const tasks = await prisma.bountyTask.findMany({
    where: {
      status: "open",
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
    },
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
    take: Math.max(take, 80),
  });

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

  return NextResponse.json({
    count: items.length,
    personalized: Boolean(session?.user),
    items: items.slice(0, take),
  });
}
