import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  skills: z.array(z.string()).optional(),
  goal: z.enum(["quick", "clear", "big", "learn"]).optional(),
  name: z.string().min(1).max(60).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      sources: { include: { source: true } },
      shortlists: { include: { task: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    skills: JSON.parse(user.skills || "[]"),
    goal: user.goal,
    sources: user.sources.map((s) => ({
      id: s.id,
      enabled: s.enabled,
      source: {
        id: s.source.id,
        key: s.source.key,
        name: s.source.name,
        description: s.source.description,
        lastSyncAt: s.source.lastSyncAt,
        lastError: s.source.lastError,
      },
    })),
    shortlists: user.shortlists,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const data: Record<string, string> = {};
  if (parsed.data.skills) data.skills = JSON.stringify(parsed.data.skills);
  if (parsed.data.goal) data.goal = parsed.data.goal;
  if (parsed.data.name) data.name = parsed.data.name;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({
    ok: true,
    skills: JSON.parse(user.skills || "[]"),
    goal: user.goal,
    name: user.name,
  });
}
