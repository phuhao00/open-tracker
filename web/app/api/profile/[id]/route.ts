import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSkills } from "@/lib/matching";
import { parseJsonList, type SocialLink, type VideoLink } from "@/lib/profile-media";

type ProfileRow = {
  id: string;
  name: string | null;
  headline: string | null;
  bio: string | null;
  aboutLong: string | null;
  socialsJson: string;
  videosJson: string;
  skills: string;
  goal: string;
  availableHours: string;
  city: string | null;
  timezone: string | null;
  reputation: number;
  createdAt: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const rows = await prisma.$queryRawUnsafe<ProfileRow[]>(
      `SELECT id, name, headline, bio, aboutLong, socialsJson, videosJson, skills, goal,
              availableHours, city, timezone, reputation, createdAt
       FROM User
       WHERE id = ? AND profilePublic = 1
       LIMIT 1`,
      id,
    );
    const base = rows[0];
    if (!base) {
      return NextResponse.json({ error: "主页不存在或未公开" }, { status: 404 });
    }

    const user = await prisma.user.findFirst({
      where: { id, profilePublic: true },
      select: {
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
      id: base.id,
      name: base.name,
      headline: base.headline,
      bio: base.bio,
      aboutLong: base.aboutLong,
      socials: parseJsonList<SocialLink>(base.socialsJson),
      videos: parseJsonList<VideoLink>(base.videosJson),
      skills: parseSkills(base.skills),
      goal: base.goal,
      availableHours: base.availableHours,
      city: base.city,
      timezone: base.timezone,
      reputation: base.reputation,
      createdAt: base.createdAt,
      claims: user.claims,
      earnings: user.earnings,
      _count: user._count,
      earnedTotalCents: earnedTotal,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误";
    console.error("[GET /api/profile]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
