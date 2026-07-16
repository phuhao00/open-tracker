import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isModerator } from "@/lib/opportunity-policy";

async function requireModerator() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !isModerator(user)) {
    return { error: NextResponse.json({ error: "需要审核员权限" }, { status: 403 }) };
  }
  // promote whitelist users to moderator role once
  if (user.role !== "moderator" && isModerator(user)) {
    await prisma.user.update({ where: { id: user.id }, data: { role: "moderator" } });
  }
  return { user };
}

export async function GET() {
  const gate = await requireModerator();
  if ("error" in gate && gate.error) return gate.error;

  const [pending, reports] = await Promise.all([
    prisma.bountyTask.findMany({
      where: { moderationStatus: "pending", publisherId: { not: null } },
      include: {
        publisher: { select: { id: true, name: true, email: true, reputation: true } },
      },
      orderBy: { fetchedAt: "asc" },
      take: 50,
    }),
    prisma.opportunityReport.findMany({
      where: { status: "open" },
      include: {
        task: { select: { id: true, title: true, moderationStatus: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ pending, reports });
}

const actionSchema = z.object({
  taskId: z.string().min(1),
  action: z.enum(["approve", "reject", "take_down"]),
  reportId: z.string().optional(),
  note: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const gate = await requireModerator();
    if ("error" in gate && gate.error) return gate.error;

    const parsed = actionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    const task = await prisma.bountyTask.findUnique({ where: { id: parsed.data.taskId } });
    if (!task) return NextResponse.json({ error: "机会不存在" }, { status: 404 });

    const statusMap = {
      approve: "approved",
      reject: "rejected",
      take_down: "taken_down",
    } as const;

    const moderationStatus = statusMap[parsed.data.action];
    await prisma.bountyTask.update({
      where: { id: task.id },
      data: {
        moderationStatus,
        status: parsed.data.action === "approve" ? "open" : "closed",
      },
    });

    if (parsed.data.reportId) {
      await prisma.opportunityReport.update({
        where: { id: parsed.data.reportId },
        data: { status: "reviewed" },
      });
    } else if (parsed.data.action === "take_down" || parsed.data.action === "reject") {
      await prisma.opportunityReport.updateMany({
        where: { taskId: task.id, status: "open" },
        data: { status: "reviewed" },
      });
    }

    return NextResponse.json({ ok: true, moderationStatus });
  } catch (e) {
    const message = e instanceof Error ? e.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
