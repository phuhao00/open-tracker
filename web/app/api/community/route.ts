import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const tipSchema = z.object({
  message: z.string().min(2).max(280),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("limit") || 40), 80);

  const [activities, activeClaims, freelancers] = await Promise.all([
    prisma.activity.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, reputation: true, skills: true } },
        task: { select: { id: true, title: true, url: true, amountText: true, projectName: true } },
      },
    }),
    prisma.taskClaim.findMany({
      where: { status: { in: ["working", "submitted"] } },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, reputation: true } },
        task: { select: { id: true, title: true, url: true, amountText: true, projectName: true } },
      },
    }),
    prisma.user.findMany({
      where: { profilePublic: true },
      orderBy: [{ reputation: "desc" }, { updatedAt: "desc" }],
      take: 12,
      select: {
        id: true,
        name: true,
        headline: true,
        skills: true,
        reputation: true,
        availableHours: true,
        city: true,
        _count: { select: { claims: true, earnings: true } },
      },
    }),
  ]);

  return NextResponse.json({
    activities: activities.map((a) => ({
      ...a,
      user: {
        ...a.user,
        skills: JSON.parse(a.user.skills || "[]"),
      },
    })),
    activeClaims,
    freelancers: freelancers.map((u) => ({
      ...u,
      skills: JSON.parse(u.skills || "[]"),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录再发动态" }, { status: 401 });
  }
  const parsed = tipSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请写 2–280 字的协作提示" }, { status: 400 });
  }

  const activity = await prisma.activity.create({
    data: {
      userId: session.user.id,
      type: "shared",
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ ok: true, activity });
}
