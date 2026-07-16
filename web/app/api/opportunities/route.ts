import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCommunitySource, ensureUserSources } from "@/lib/sources/sync";
import {
  contentLooksBlocked,
  decideModerationStatus,
  DEFAULT_EXPIRE_DAYS,
  EMPLOYMENT_DISCLAIMER,
  MAX_POSTS_PER_DAY,
  type ContactMode,
  type EngagementType,
} from "@/lib/opportunity-policy";
import { postFingerprint } from "@/lib/opportunity-fingerprint";
import { normalizeHttpUrl } from "@/lib/profile-media";

const createSchema = z.object({
  title: z.string().min(4).max(120),
  summary: z.string().min(20).max(2000),
  projectName: z.string().min(1).max(80).optional(),
  url: z.string().max(500).optional().nullable(),
  techTags: z.array(z.string().min(1).max(40)).max(12).default([]),
  engagementType: z.enum(["project", "employment"]),
  workKind: z.enum(["bounty", "parttime", "job", "opportunity"]).optional(),
  amountText: z.string().max(80).optional().nullable(),
  amountMin: z.number().int().min(0).optional().nullable(),
  amountMax: z.number().int().min(0).optional().nullable(),
  currency: z.string().min(3).max(8).default("USD"),
  locationText: z.string().max(80).optional().nullable(),
  regionHint: z.enum(["cn", "global", "remote"]).optional(),
  contactMode: z.enum(["profile", "email", "url"]),
  contactValue: z.string().max(200).optional().nullable(),
  expireDays: z.number().int().min(7).max(90).default(DEFAULT_EXPIRE_DAYS),
  employmentAccepted: z.boolean().optional(),
});

function mapKind(engagementType: EngagementType, workKind?: string): string {
  if (workKind) return workKind;
  if (engagementType === "employment") return "job";
  return "opportunity";
}

function publicTask(task: {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  projectName: string;
  techTags: string;
  kind: string;
  status: string;
  amountText: string | null;
  amountMin: number | null;
  amountMax: number | null;
  currency: string;
  engagementType: string;
  moderationStatus: string;
  expiresAt: Date | null;
  contactMode: string | null;
  contactValue: string | null;
  locationText: string | null;
  publisherId: string | null;
  fetchedAt: Date;
  updatedAt: Date;
  publisher?: { id: string; name: string | null; headline: string | null } | null;
}) {
  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    url: task.url,
    projectName: task.projectName,
    techTags: (() => {
      try {
        const a = JSON.parse(task.techTags || "[]");
        return Array.isArray(a) ? a : [];
      } catch {
        return [];
      }
    })(),
    kind: task.kind,
    status: task.status,
    amountText: task.amountText,
    amountMin: task.amountMin,
    amountMax: task.amountMax,
    currency: task.currency,
    engagementType: task.engagementType,
    moderationStatus: task.moderationStatus,
    expiresAt: task.expiresAt,
    contactMode: task.contactMode,
    locationText: task.locationText,
    publisherId: task.publisherId,
    publisher: task.publisher || null,
    fetchedAt: task.fetchedAt,
    updatedAt: task.updatedAt,
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  if (!mine) {
    return NextResponse.json({ error: "请使用 ?mine=1 查看自己的发布" }, { status: 400 });
  }

  const tasks = await prisma.bountyTask.findMany({
    where: { publisherId: session.user.id },
    include: {
      publisher: { select: { id: true, name: true, headline: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    items: tasks.map((t) => ({
      ...publicTask(t),
      contactValue: t.contactValue,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const blocked = contentLooksBlocked(data.title, data.summary, data.projectName, ...(data.techTags || []));
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });

    if (data.engagementType === "employment" && data.employmentAccepted !== true) {
      return NextResponse.json(
        { error: "发布雇佣类机会前，请勾选合规确认", disclaimer: EMPLOYMENT_DISCLAIMER },
        { status: 400 },
      );
    }

    let url = data.url?.trim() || "";
    if (url) {
      const normalized = normalizeHttpUrl(url);
      if (!normalized) return NextResponse.json({ error: "外链 URL 无效" }, { status: 400 });
      url = normalized;
    }

    let contactValue = data.contactValue?.trim() || null;
    const contactMode = data.contactMode as ContactMode;
    if (contactMode === "profile") {
      contactValue = null;
    } else if (contactMode === "email") {
      if (!contactValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
        return NextResponse.json({ error: "请填写有效联系邮箱" }, { status: 400 });
      }
    } else if (contactMode === "url") {
      const n = contactValue ? normalizeHttpUrl(contactValue) : null;
      if (!n) return NextResponse.json({ error: "请填写有效联系链接" }, { status: 400 });
      contactValue = n;
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await prisma.bountyTask.count({
      where: { publisherId: user.id, fetchedAt: { gte: dayAgo } },
    });
    if (recentCount >= MAX_POSTS_PER_DAY) {
      return NextResponse.json(
        { error: `为防滥用，每 24 小时最多发布 ${MAX_POSTS_PER_DAY} 条机会` },
        { status: 429 },
      );
    }

    const fp = postFingerprint(user.id, data.title);
    const dup = await prisma.bountyTask.findFirst({
      where: {
        publisherId: user.id,
        title: data.title.trim(),
        status: "open",
        moderationStatus: { in: ["pending", "approved"] },
      },
    });
    if (dup) {
      return NextResponse.json({ error: "你已发布过相同标题的开放机会，请勿重复发布" }, { status: 409 });
    }

    const source = await ensureCommunitySource();
    await ensureUserSources(user.id);

    const moderationStatus = decideModerationStatus(user);
    const kind = mapKind(data.engagementType, data.workKind);
    const tags = [...data.techTags];
    if (data.regionHint === "cn") tags.push("国内");
    if (data.regionHint === "remote") tags.push("远程");
    if (data.regionHint === "global") tags.push("海外");
    if (data.engagementType === "project") tags.push("项目协作");
    if (data.engagementType === "employment") tags.push("雇佣机会");

    const externalId = `ugc_${user.id.slice(0, 8)}_${fp}_${Date.now().toString(36)}`;
    const profileUrl = `/u/${user.id}`;
    const expiresAt = new Date(Date.now() + data.expireDays * 24 * 60 * 60 * 1000);

    const task = await prisma.bountyTask.create({
      data: {
        sourceId: source.id,
        externalId,
        title: data.title.trim(),
        url: url || profileUrl,
        projectName: (data.projectName || user.name || "个人 OPC").trim(),
        amountText: data.amountText?.trim() || null,
        amountMin: data.amountMin ?? null,
        amountMax: data.amountMax ?? null,
        currency: data.currency,
        techTags: JSON.stringify(tags),
        kind,
        status: "open",
        summary: data.summary.trim(),
        publisherId: user.id,
        engagementType: data.engagementType,
        moderationStatus,
        expiresAt,
        contactMode,
        contactValue,
        locationText: data.locationText?.trim() || null,
        rawJson: JSON.stringify({
          ugc: true,
          engagementType: data.engagementType,
          fingerprint: fp,
          regionHint: data.regionHint || null,
        }),
        fetchedAt: new Date(),
      },
      include: {
        publisher: { select: { id: true, name: true, headline: true } },
      },
    });

    await prisma.activity.create({
      data: {
        userId: user.id,
        taskId: task.id,
        type: "shared",
        message:
          moderationStatus === "approved"
            ? `发布了机会：${task.title}`
            : `提交了机会待审：${task.title}`,
      },
    });

    return NextResponse.json({
      ok: true,
      moderationStatus,
      message:
        moderationStatus === "approved"
          ? "已发布到大厅"
          : "已提交，新账号需审核通过后才会公开显示",
      item: {
        ...publicTask(task),
        contactValue: task.contactValue,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "发布失败";
    console.error("[POST /api/opportunities]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(4).max(120).optional(),
  summary: z.string().min(20).max(2000).optional(),
  status: z.enum(["open", "closed"]).optional(),
  contactMode: z.enum(["profile", "email", "url"]).optional(),
  contactValue: z.string().max(200).optional().nullable(),
  amountText: z.string().max(80).optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    const task = await prisma.bountyTask.findUnique({ where: { id: parsed.data.id } });
    if (!task || task.publisherId !== session.user.id) {
      return NextResponse.json({ error: "无权编辑该机会" }, { status: 403 });
    }
    if (task.moderationStatus === "taken_down") {
      return NextResponse.json({ error: "该机会已被下架，无法编辑" }, { status: 400 });
    }

    const blocked = contentLooksBlocked(parsed.data.title, parsed.data.summary);
    if (blocked) return NextResponse.json({ error: blocked }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
    if (parsed.data.summary !== undefined) data.summary = parsed.data.summary.trim();
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.amountText !== undefined) data.amountText = parsed.data.amountText;
    if (parsed.data.contactMode !== undefined) data.contactMode = parsed.data.contactMode;
    if (parsed.data.contactValue !== undefined) data.contactValue = parsed.data.contactValue;

    const updated = await prisma.bountyTask.update({
      where: { id: task.id },
      data,
      include: { publisher: { select: { id: true, name: true, headline: true } } },
    });

    return NextResponse.json({
      ok: true,
      item: { ...publicTask(updated), contactValue: updated.contactValue },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const task = await prisma.bountyTask.findUnique({ where: { id } });
    if (!task || task.publisherId !== session.user.id) {
      return NextResponse.json({ error: "无权删除该机会" }, { status: 403 });
    }

    await prisma.bountyTask.update({
      where: { id },
      data: { status: "closed", moderationStatus: "taken_down" },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "删除失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
