import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseSkills } from "@/lib/matching";
import {
  normalizeHttpUrl,
  parseJsonList,
  type SocialLink,
  type VideoLink,
} from "@/lib/profile-media";

const socialSchema = z.object({
  platform: z.string().min(1).max(40),
  url: z.string().min(1).max(500),
  label: z.string().max(60).optional(),
});

const videoSchema = z.object({
  title: z.string().max(120).optional(),
  url: z.string().min(1).max(500),
});

const patchSchema = z.object({
  skills: z.array(z.string()).optional(),
  goal: z.enum(["quick", "clear", "big", "learn"]).optional(),
  name: z.string().min(1).max(60).optional(),
  headline: z.string().max(120).optional().nullable(),
  bio: z.string().max(800).optional().nullable(),
  aboutLong: z.string().max(6000).optional().nullable(),
  availableHours: z.enum(["fulltime", "parttime", "weekends", "flexible"]).optional(),
  city: z.string().max(60).optional().nullable(),
  timezone: z.string().max(60).optional().nullable(),
  profilePublic: z.boolean().optional(),
  socials: z.array(socialSchema).max(20).optional(),
  videos: z.array(videoSchema).max(12).optional(),
});

function mapSocials(raw: string | null | undefined): SocialLink[] {
  return parseJsonList<SocialLink>(raw);
}

function mapVideos(raw: string | null | undefined): VideoLink[] {
  return parseJsonList<VideoLink>(raw);
}

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  headline: string | null;
  bio: string | null;
  aboutLong: string | null;
  socialsJson: string;
  videosJson: string;
  availableHours: string;
  city: string | null;
  timezone: string | null;
  profilePublic: boolean;
  reputation: number;
  skills: string;
  goal: string;
};

async function loadUserProfile(id: string): Promise<UserRow | null> {
  const rows = await prisma.$queryRawUnsafe<UserRow[]>(
    `SELECT id, email, name, headline, bio, aboutLong, socialsJson, videosJson,
            availableHours, city, timezone, profilePublic, reputation, skills, goal
     FROM User WHERE id = ? LIMIT 1`,
    id,
  );
  return rows[0] ?? null;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await loadUserProfile(session.user.id);
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const extras = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        sources: { include: { source: true } },
        shortlists: { include: { task: true }, orderBy: { createdAt: "desc" } },
        claims: {
          include: { task: true },
          orderBy: { updatedAt: "desc" },
          take: 20,
        },
        earnings: { orderBy: { earnedAt: "desc" }, take: 20 },
      },
    });
    if (!extras) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const earnedTotal = extras.earnings.reduce((s, e) => s + e.amountCents, 0);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      headline: user.headline,
      bio: user.bio,
      aboutLong: user.aboutLong,
      socials: mapSocials(user.socialsJson),
      videos: mapVideos(user.videosJson),
      availableHours: user.availableHours,
      city: user.city,
      timezone: user.timezone,
      profilePublic: Boolean(user.profilePublic),
      reputation: user.reputation,
      skills: parseSkills(user.skills),
      goal: user.goal,
      earnedTotalCents: earnedTotal,
      sources: extras.sources.map((s) => ({
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
      shortlists: extras.shortlists,
      claims: extras.claims,
      earnings: extras.earnings,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误";
    console.error("[GET /api/me]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效", details: parsed.error.flatten() }, { status: 400 });
    }

    const current = await loadUserProfile(session.user.id);
    if (!current) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    const next = {
      name: parsed.data.name ?? current.name,
      headline: parsed.data.headline !== undefined ? parsed.data.headline : current.headline,
      bio: parsed.data.bio !== undefined ? parsed.data.bio : current.bio,
      aboutLong: parsed.data.aboutLong !== undefined ? parsed.data.aboutLong : current.aboutLong,
      availableHours: parsed.data.availableHours ?? current.availableHours,
      city: parsed.data.city !== undefined ? parsed.data.city : current.city,
      timezone: parsed.data.timezone !== undefined ? parsed.data.timezone : current.timezone,
      profilePublic:
        parsed.data.profilePublic !== undefined ? parsed.data.profilePublic : Boolean(current.profilePublic),
      skills: parsed.data.skills ? JSON.stringify(parsed.data.skills) : current.skills,
      goal: parsed.data.goal ?? current.goal,
      socialsJson: current.socialsJson || "[]",
      videosJson: current.videosJson || "[]",
    };

    if (parsed.data.socials) {
      const cleaned: SocialLink[] = [];
      for (const s of parsed.data.socials) {
        if (s.platform === "email") {
          cleaned.push({
            platform: s.platform,
            url: s.url.trim(),
            ...(s.label ? { label: s.label } : {}),
          });
          continue;
        }
        const url = normalizeHttpUrl(s.url);
        if (!url) continue;
        cleaned.push({
          platform: s.platform,
          url,
          ...(s.label ? { label: s.label } : {}),
        });
      }
      next.socialsJson = JSON.stringify(cleaned);
    }

    if (parsed.data.videos) {
      const cleaned: VideoLink[] = [];
      for (const v of parsed.data.videos) {
        const url = normalizeHttpUrl(v.url);
        if (!url) continue;
        cleaned.push({
          ...(v.title?.trim() ? { title: v.title.trim() } : {}),
          url,
        });
      }
      next.videosJson = JSON.stringify(cleaned);
    }

    // 使用 raw SQL，避免热更新后 Prisma Client 缓存未识别新字段导致 500
    await prisma.$executeRawUnsafe(
      `UPDATE User SET
        name = ?,
        headline = ?,
        bio = ?,
        aboutLong = ?,
        availableHours = ?,
        city = ?,
        timezone = ?,
        profilePublic = ?,
        skills = ?,
        goal = ?,
        socialsJson = ?,
        videosJson = ?,
        updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      next.name,
      next.headline,
      next.bio,
      next.aboutLong,
      next.availableHours,
      next.city,
      next.timezone,
      next.profilePublic ? 1 : 0,
      next.skills,
      next.goal,
      next.socialsJson,
      next.videosJson,
      session.user.id,
    );

    const user = await loadUserProfile(session.user.id);
    if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      skills: parseSkills(user.skills),
      goal: user.goal,
      name: user.name,
      headline: user.headline,
      bio: user.bio,
      aboutLong: user.aboutLong,
      socials: mapSocials(user.socialsJson),
      videos: mapVideos(user.videosJson),
      availableHours: user.availableHours,
      city: user.city,
      profilePublic: Boolean(user.profilePublic),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知错误";
    console.error("[PATCH /api/me]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
