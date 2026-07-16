import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isModerator } from "@/lib/opportunity-policy";

const reportSchema = z.object({
  taskId: z.string().min(1),
  reason: z.enum(["spam", "illegal", "misleading", "scam", "other"]),
  detail: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录后再举报" }, { status: 401 });
    }
    const parsed = reportSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    const task = await prisma.bountyTask.findUnique({ where: { id: parsed.data.taskId } });
    if (!task) return NextResponse.json({ error: "机会不存在" }, { status: 404 });

    const existing = await prisma.opportunityReport.findFirst({
      where: {
        taskId: task.id,
        reporterId: session.user.id,
        status: "open",
      },
    });
    if (existing) {
      return NextResponse.json({ error: "你已举报过该机会，我们会尽快处理" }, { status: 409 });
    }

    await prisma.opportunityReport.create({
      data: {
        taskId: task.id,
        reporterId: session.user.id,
        reason: parsed.data.reason,
        detail: parsed.data.detail?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true, message: "已收到举报，审核人员将处理" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "举报失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !isModerator(user)) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const reports = await prisma.opportunityReport.findMany({
    where: { status: "open" },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          summary: true,
          moderationStatus: true,
          publisherId: true,
        },
      },
      reporter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ items: reports });
}
