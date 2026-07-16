import { NextResponse } from "next/server";
import { extractBilibiliMid, fetchBilibiliEmbed } from "@/lib/bilibili-embed";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("url") || searchParams.get("mid") || "";
    const mid = extractBilibiliMid(raw);
    if (!mid) {
      return NextResponse.json(
        { error: "请使用 space.bilibili.com/数字UID 形式的主页链接" },
        { status: 400 },
      );
    }

    const data = await fetchBilibiliEmbed(mid);
    if (!data) {
      return NextResponse.json({ error: "未找到该 Bilibili 用户" }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "拉取 Bilibili 资料失败";
    console.error("[GET /api/bilibili/embed]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
