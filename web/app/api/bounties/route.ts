import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listBounties } from "@/lib/bounties-list";
import type { OpportunityBucket, PortalChannel, RegionCode, WorkType } from "@/lib/taxonomy";

type CacheEntry = { expires: number; body: Awaited<ReturnType<typeof listBounties>> };

const anonCache = new Map<string, CacheEntry>();
const ANON_TTL_MS = 20_000;
const ANON_CACHE_MAX = 40;

function cacheKey(url: URL) {
  return url.searchParams.toString();
}

function getAnonCached(key: string) {
  const hit = anonCache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    anonCache.delete(key);
    return null;
  }
  return hit.body;
}

function setAnonCached(key: string, body: CacheEntry["body"]) {
  if (anonCache.size >= ANON_CACHE_MAX) {
    const first = anonCache.keys().next().value;
    if (first) anonCache.delete(first);
  }
  anonCache.set(key, { expires: Date.now() + ANON_TTL_MS, body });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sourceKey = searchParams.get("source") ?? "";
  const kind = searchParams.get("kind")?.trim() ?? "";
  const bucket = (searchParams.get("bucket")?.trim() ?? "") as "" | OpportunityBucket;
  const region = (searchParams.get("region")?.trim() ?? "") as "" | RegionCode;
  const workType = (searchParams.get("workType")?.trim() ?? "") as "" | WorkType;
  const channel = (searchParams.get("channel")?.trim() ?? "") as PortalChannel;
  const engagementType = (searchParams.get("engagement")?.trim() ?? "") as
    | ""
    | "project"
    | "employment";
  const sort = searchParams.get("sort") || "match";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("limit") || 10) || 10, 1), 40);

  const session = await auth();
  const userId = session?.user?.id ?? null;
  const key = cacheKey(new URL(req.url));

  // 游客短缓存，避免大厅反复全量扫描
  if (!userId) {
    const cached = getAnonCached(key);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
          "X-Cache": "HIT",
        },
      });
    }
  }

  const body = await listBounties({
    q,
    sourceKey,
    kind,
    bucket,
    region,
    workType,
    channel,
    engagementType,
    sort,
    page,
    pageSize,
    userId,
  });

  if (!userId) setAnonCached(key, body);

  return NextResponse.json(body, {
    headers: userId
      ? { "Cache-Control": "private, no-store" }
      : { "Cache-Control": "public, max-age=10, stale-while-revalidate=30", "X-Cache": "MISS" },
  });
}
