import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const tipSchema = z.object({
  message: z.string().min(2).max(280),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("limit") || 8) || 8, 1), 40);
  const claimsPage = Math.max(1, Number(searchParams.get("claimsPage") || 1) || 1);
  const claimsPageSize = Math.min(
    Math.max(Number(searchParams.get("claimsLimit") || 6) || 6, 1),
    30,
  );

  const [activityTotal, claimTotal, activities, activeClaims, freelancers] =
    await Promise.all([
      prisma.activity.count(),
      prisma.taskClaim.count({
        where: { status: { in: ["working", "submitted"] } },
      }),
      prisma.activity.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, reputation: true, skills: true } },
          task: {
            select: { id: true, title: true, url: true, amountText: true, projectName: true },
          },
        },
      }),
      prisma.taskClaim.findMany({
        where: { status: { in: ["working", "submitted"] } },
        skip: (claimsPage - 1) * claimsPageSize,
        take: claimsPageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          user: { select: { id: true, name: true, reputation: true } },
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

  const activityTotalPages = Math.max(1, Math.ceil(activityTotal / pageSize));
  const claimsTotalPages = Math.max(1, Math.ceil(claimTotal / claimsPageSize));

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
    pagination: {
      activities: {
        page: Math.min(page, activityTotalPages),
        pageSize,
        total: activityTotal,
        totalPages: activityTotalPages,
      },
      claims: {
        page: Math.min(claimsPage, claimsTotalPages),
        pageSize: claimsPageSize,
        total: claimTotal,
        totalPages: claimsTotalPages,
      },
    },
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
