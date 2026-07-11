import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSkills } from "@/lib/matching";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await prisma.user.findFirst({
    where: { id, profilePublic: true },
    select: {
      id: true,
      name: true,
      headline: true,
      bio: true,
      skills: true,
      goal: true,
      availableHours: true,
      city: true,
      timezone: true,
      reputation: true,
      createdAt: true,
      claims: {
        where: { status: { in: ["working", "submitted", "paid"] } },
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              url: true,
              amountText: true,
              projectName: true,
            },
          },
        },
      },
      earnings: {
        orderBy: { earnedAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          amountCents: true,
          currency: true,
          projectName: true,
          earnedAt: true,
        },
      },
      _count: {
        select: { claims: true, earnings: true, shortlists: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "主页不存在或未公开" }, { status: 404 });
  }

  const earnedTotal = user.earnings.reduce((s, e) => s + e.amountCents, 0);

  return NextResponse.json({
    ...user,
    skills: parseSkills(user.skills),
    earnedTotalCents: earnedTotal,
  });
}
