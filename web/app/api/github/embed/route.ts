import { NextResponse } from "next/server";
import { extractGithubUsername, fetchGithubEmbed } from "@/lib/github-embed";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("user") || searchParams.get("url") || "";
    const login = extractGithubUsername(
      raw.includes("/") || raw.includes(".") ? raw : `https://github.com/${raw}`,
    );
    if (!login) {
      return NextResponse.json({ error: "无效的 GitHub 用户名或链接" }, { status: 400 });
    }

    const data = await fetchGithubEmbed(login);
    if (!data) {
      return NextResponse.json({ error: "未找到该 GitHub 用户" }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "拉取 GitHub 资料失败";
    console.error("[GET /api/github/embed]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
