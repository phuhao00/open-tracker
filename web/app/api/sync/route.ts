import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isModerator } from "@/lib/opportunity-policy";
import {
  syncAllEnabledSources,
  syncSource,
  ensureDefaultSources,
  ensureUserSources,
} from "@/lib/sources/sync";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !isModerator(user)) {
    return NextResponse.json(
      { error: "同步数据源仅限审核员。普通用户请使用「发布机会」或等待系统同步。" },
      { status: 403 },
    );
  }

  try {
    await ensureDefaultSources();
    await ensureUserSources(session.user.id);
    const body = await req.json().catch(() => ({}));
    const key = typeof body.key === "string" ? body.key : null;
    if (key) {
      const result = await syncSource(key);
      return NextResponse.json({ ok: true, results: [result] });
    }
    const results = await syncAllEnabledSources();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "同步失败" },
      { status: 500 },
    );
  }
}
