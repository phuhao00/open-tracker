import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseSkills } from "@/lib/matching";

const patchSchema = z.object({
  skills: z.array(z.string()).optional(),
  goal: z.enum(["quick", "clear", "big", "learn"]).optional(),
  name: z.string().min(1).max(60).optional(),
  headline: z.string().max(120).optional().nullable(),
  bio: z.string().max(800).optional().nullable(),
  availableHours: z.enum(["fulltime", "parttime", "weekends", "flexible"]).optional(),
  city: z.string().max(60).optional().nullable(),
  timezone: z.string().max(60).optional().nullable(),
  profilePublic: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      sources: { include: { source: true } },
      shortlists: { include: { task: true }, orderBy: { createdAt: "desc" } },
      claims: {
        include: { task: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      earnings: { orderBy: { earnedAt: "desc" }, take: 20 },
    },
  });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const earnedTotal = user.earnings.reduce((s, e) => s + e.amountCents, 0);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    headline: user.headline,
    bio: user.bio,
    availableHours: user.availableHours,
    city: user.city,
    timezone: user.timezone,
    profilePublic: user.profilePublic,
    reputation: user.reputation,
    skills: parseSkills(user.skills),
    goal: user.goal,
    earnedTotalCents: earnedTotal,
    sources: user.sources.map((s) => ({
      id: s.id,
      enabled: s.enabled,
      source: {
        id: s.source.id,
        key: s.source.key,
        name: s.source.name,
        description: s.source.description,
        lastSyncAt: s.source.lastSyncAt,
        lastError: s.source.lastError,
      },
    })),
    shortlists: user.shortlists,
    claims: user.claims,
    earnings: user.earnings,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.skills) data.skills = JSON.stringify(parsed.data.skills);
  if (parsed.data.goal) data.goal = parsed.data.goal;
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.headline !== undefined) data.headline = parsed.data.headline;
  if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;
  if (parsed.data.availableHours) data.availableHours = parsed.data.availableHours;
  if (parsed.data.city !== undefined) data.city = parsed.data.city;
  if (parsed.data.timezone !== undefined) data.timezone = parsed.data.timezone;
  if (parsed.data.profilePublic !== undefined) data.profilePublic = parsed.data.profilePublic;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({
    ok: true,
    skills: parseSkills(user.skills),
    goal: user.goal,
    name: user.name,
    headline: user.headline,
    bio: user.bio,
    availableHours: user.availableHours,
    city: user.city,
    profilePublic: user.profilePublic,
  });
}
