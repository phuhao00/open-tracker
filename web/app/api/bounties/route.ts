import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSources } from "@/lib/sources/sync";

export async function GET(req: Request) {
  await ensureDefaultSources();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sourceKey = searchParams.get("source") ?? "";
  const take = Math.min(Number(searchParams.get("limit") || 60), 100);

  const session = await auth();
  let allowedSourceIds: string[] | null = null;
  if (session?.user?.id) {
    const links = await prisma.userSource.findMany({
      where: { userId: session.user.id, enabled: true },
      select: { sourceId: true },
    });
    if (links.length) allowedSourceIds = links.map((l) => l.sourceId);
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
    include: { source: true },
    orderBy: [{ amountMax: "desc" }, { fetchedAt: "desc" }],
    take,
  });

  return NextResponse.json({
    count: tasks.length,
    items: tasks.map((t) => ({
      ...t,
      techTags: JSON.parse(t.techTags || "[]"),
    })),
  });
}
