import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  sourceId: z.string(),
  enabled: z.boolean(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const link = await prisma.userSource.upsert({
    where: {
      userId_sourceId: {
        userId: session.user.id,
        sourceId: parsed.data.sourceId,
      },
    },
    create: {
      userId: session.user.id,
      sourceId: parsed.data.sourceId,
      enabled: parsed.data.enabled,
    },
    update: { enabled: parsed.data.enabled },
  });

  return NextResponse.json({ ok: true, link });
}
