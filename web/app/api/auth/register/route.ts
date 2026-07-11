import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSources } from "@/lib/sources/sync";

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "请填写有效邮箱，密码至少 6 位" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name || email.split("@")[0],
        passwordHash,
        skills: JSON.stringify(["TypeScript", "JavaScript", "React"]),
        goal: "quick",
      },
    });

    await ensureDefaultSources();
    const sources = await prisma.bountySource.findMany();
    await prisma.userSource.createMany({
      data: sources.map((s) => ({
        userId: user.id,
        sourceId: s.id,
        enabled: true,
      })),
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "注册失败" },
      { status: 500 },
    );
  }
}
