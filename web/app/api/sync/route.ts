import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncAllEnabledSources, syncSource, ensureDefaultSources, ensureUserSources } from "@/lib/sources/sync";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
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
