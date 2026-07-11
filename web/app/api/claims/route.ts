import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  taskId: z.string(),
  note: z.string().max(200).optional(),
});

const patchSchema = z.object({
  taskId: z.string(),
  status: z.enum(["working", "submitted", "paid", "dropped"]),
  note: z.string().max(200).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const claims = await prisma.taskClaim.findMany({
    where: { userId: session.user.id },
    include: { task: { include: { source: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ items: claims });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录再认领" }, { status: 401 });
  }
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const task = await prisma.bountyTask.findUnique({ where: { id: parsed.data.taskId } });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  const activeOthers = await prisma.taskClaim.count({
    where: {
      taskId: task.id,
      status: { in: ["working", "submitted"] },
      userId: { not: session.user.id },
    },
  });

  const claim = await prisma.taskClaim.upsert({
    where: {
      userId_taskId: { userId: session.user.id, taskId: task.id },
    },
    create: {
      userId: session.user.id,
      taskId: task.id,
      status: "working",
      note: parsed.data.note,
    },
    update: {
      status: "working",
      note: parsed.data.note,
    },
  });

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      taskId: task.id,
      type: "claimed",
      message: `认领了「${task.title.slice(0, 60)}」${activeOthers ? `（已有 ${activeOthers} 人在做）` : ""}`,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { reputation: { increment: 1 } },
  });

  return NextResponse.json({
    ok: true,
    claim,
    warning:
      activeOthers > 0
        ? `已有 ${activeOthers} 位伙伴也在做这单，建议先沟通或换一单，避免撞车。`
        : null,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const claim = await prisma.taskClaim.update({
    where: {
      userId_taskId: {
        userId: session.user.id,
        taskId: parsed.data.taskId,
      },
    },
    data: {
      status: parsed.data.status,
      note: parsed.data.note,
    },
    include: { task: true },
  });

  const typeMap: Record<string, string> = {
    submitted: "submitted",
    paid: "paid",
    dropped: "tip",
    working: "claimed",
  };
  const msgMap: Record<string, string> = {
    submitted: `提交了「${claim.task.title.slice(0, 50)}」等待验收`,
    paid: `完成并收到「${claim.task.title.slice(0, 50)}」的报酬`,
    dropped: `放弃了「${claim.task.title.slice(0, 50)}」，把机会让给伙伴`,
    working: `继续推进「${claim.task.title.slice(0, 50)}」`,
  };

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      taskId: claim.taskId,
      type: typeMap[parsed.data.status] || "tip",
      message: msgMap[parsed.data.status] || "更新了认领状态",
    },
  });

  if (parsed.data.status === "paid") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { reputation: { increment: 5 } },
    });
  }

  return NextResponse.json({ ok: true, claim });
}
