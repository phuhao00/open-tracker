import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  title: z.string().min(1).max(120),
  amountCents: z.number().int().positive(),
  currency: z.string().default("USD"),
  projectName: z.string().max(80).optional(),
  taskUrl: z.string().url().optional().or(z.literal("")),
  note: z.string().max(200).optional(),
  earnedAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const items = await prisma.earning.findMany({
    where: { userId: session.user.id },
    orderBy: { earnedAt: "desc" },
  });
  const total = items.reduce((s, i) => s + i.amountCents, 0);
  return NextResponse.json({ items, totalCents: total });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请填写标题和有效金额（美分整数）" }, { status: 400 });
  }

  const item = await prisma.earning.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      amountCents: parsed.data.amountCents,
      currency: parsed.data.currency || "USD",
      projectName: parsed.data.projectName,
      taskUrl: parsed.data.taskUrl || null,
      note: parsed.data.note,
      earnedAt: parsed.data.earnedAt ? new Date(parsed.data.earnedAt) : new Date(),
    },
  });

  await prisma.activity.create({
    data: {
      userId: session.user.id,
      type: "paid",
      message: `记录了一笔收益：${parsed.data.title}（$${(parsed.data.amountCents / 100).toFixed(0)}）`,
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { reputation: { increment: 2 } },
  });

  return NextResponse.json({ ok: true, item });
}
