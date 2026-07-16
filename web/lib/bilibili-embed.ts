import { extractBilibiliMid } from "@/lib/profile-media";

export { extractBilibiliMid };

export type BilibiliPublicProfile = {
  mid: string;
  name: string;
  face: string;
  sign: string | null;
  fans: number;
  following: number;
  level: number | null;
  htmlUrl: string;
};

export type BilibiliPublicVideo = {
  bvid: string;
  aid: number;
  title: string;
  description: string | null;
  pic: string;
  play: number;
  length: string;
  created: number;
  htmlUrl: string;
};

export type BilibiliEmbedPayload = {
  profile: BilibiliPublicProfile;
  videos: BilibiliPublicVideo[];
};

function httpsify(url: string | null | undefined): string {
  if (!url) return "";
  return url.replace(/^http:\/\//i, "https://");
}

function bilibiliHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: "https://www.bilibili.com",
  };
}

export async function fetchBilibiliEmbed(mid: string): Promise<BilibiliEmbedPayload | null> {
  const headers = bilibiliHeaders();

  const cardRes = await fetch(
    `https://api.bilibili.com/x/web-interface/card?mid=${encodeURIComponent(mid)}`,
    { headers, next: { revalidate: 1800 } },
  );
  if (!cardRes.ok) {
    throw new Error(`Bilibili 用户接口失败（${cardRes.status}）`);
  }
  const cardJson = (await cardRes.json()) as {
    code: number;
    message?: string;
    data?: {
      card?: {
        mid?: string | number;
        name?: string;
        face?: string;
        sign?: string;
        fans?: number;
        attention?: number;
        level_info?: { current_level?: number };
      };
      archive_count?: number;
    };
  };

  if (cardJson.code !== 0 || !cardJson.data?.card?.mid) {
    if (cardJson.code === -404 || cardJson.code === 19002003) return null;
    throw new Error(cardJson.message || `Bilibili 返回错误（${cardJson.code}）`);
  }

  const card = cardJson.data.card;
  const profile: BilibiliPublicProfile = {
    mid: String(card.mid),
    name: card.name || `UID ${card.mid}`,
    face: httpsify(card.face),
    sign: card.sign?.trim() || null,
    fans: Number(card.fans || 0),
    following: Number(card.attention || 0),
    level: card.level_info?.current_level ?? null,
    htmlUrl: `https://space.bilibili.com/${card.mid}`,
  };

  let videos: BilibiliPublicVideo[] = [];
  try {
    const arcRes = await fetch(
      `https://api.bilibili.com/x/space/arc/search?mid=${encodeURIComponent(mid)}&ps=6&pn=1&order=pubdate`,
      { headers, next: { revalidate: 1800 } },
    );
    if (arcRes.ok) {
      const arcJson = (await arcRes.json()) as {
        code: number;
        data?: {
          list?: {
            vlist?: Array<{
              bvid: string;
              aid: number;
              title: string;
              description?: string;
              pic?: string;
              play?: number;
              length?: string;
              created?: number;
            }>;
          };
        };
      };
      if (arcJson.code === 0 && Array.isArray(arcJson.data?.list?.vlist)) {
        videos = arcJson.data.list.vlist.slice(0, 6).map((v) => ({
          bvid: v.bvid,
          aid: v.aid,
          title: v.title,
          description: v.description?.trim() || null,
          pic: httpsify(v.pic),
          play: Number(v.play || 0),
          length: v.length || "",
          created: Number(v.created || 0),
          htmlUrl: `https://www.bilibili.com/video/${v.bvid}`,
        }));
      }
    }
  } catch {
    // videos are optional enrichment
  }

  return { profile, videos };
}
