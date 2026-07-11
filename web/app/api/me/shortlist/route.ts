import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addSchema = z.object({
  taskId: z.string().optional(),
  projectKey: z.string().optional(),
  note: z.string().max(200).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const items = await prisma.shortlist.findMany({
    where: { userId: session.user.id },
    include: { task: { include: { source: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success || (!parsed.data.taskId && !parsed.data.projectKey)) {
    return NextResponse.json({ error: "需要 taskId 或 projectKey" }, { status: 400 });
  }

  if (parsed.data.taskId) {
    const item = await prisma.shortlist.upsert({
      where: {
        userId_taskId: {
          userId: session.user.id,
          taskId: parsed.data.taskId,
        },
      },
      create: {
        userId: session.user.id,
        taskId: parsed.data.taskId,
        note: parsed.data.note,
      },
      update: { note: parsed.data.note },
    });
    return NextResponse.json({ ok: true, item });
  }

  const item = await prisma.shortlist.upsert({
    where: {
      userId_projectKey: {
        userId: session.user.id,
        projectKey: parsed.data.projectKey!,
      },
    },
    create: {
      userId: session.user.id,
      projectKey: parsed.data.projectKey,
      note: parsed.data.note,
    },
    update: { note: parsed.data.note },
  });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const projectKey = searchParams.get("projectKey");
  if (taskId) {
    await prisma.shortlist.deleteMany({
      where: { userId: session.user.id, taskId },
    });
  } else if (projectKey) {
    await prisma.shortlist.deleteMany({
      where: { userId: session.user.id, projectKey },
    });
  } else {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
