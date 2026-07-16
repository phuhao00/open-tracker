export type SocialLink = {
  platform: string;
  url: string;
  label?: string;
};

/** 作品条目：优先视频内嵌，也支持外链作品 */
export type WorkItem = {
  title?: string;
  description?: string;
  url: string;
};

/** @deprecated 使用 WorkItem；保留别名兼容旧代码 */
export type VideoLink = WorkItem;

export const SOCIAL_PLATFORMS: Array<{ id: string; label: string; placeholder: string }> = [
  { id: "github", label: "GitHub", placeholder: "https://github.com/username" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/..." },
  { id: "x", label: "X / Twitter", placeholder: "https://x.com/username" },
  { id: "website", label: "个人网站", placeholder: "https://..." },
  { id: "bilibili", label: "Bilibili", placeholder: "https://space.bilibili.com/你的UID" },
  { id: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@..." },
  { id: "zhihu", label: "知乎", placeholder: "https://www.zhihu.com/people/..." },
  { id: "juejin", label: "掘金", placeholder: "https://juejin.cn/user/..." },
  { id: "xiaohongshu", label: "小红书", placeholder: "https://www.xiaohongshu.com/..." },
  { id: "douyin", label: "抖音", placeholder: "https://www.douyin.com/..." },
  { id: "wechat", label: "微信公众号 / 主页", placeholder: "链接或说明" },
  { id: "email", label: "公开邮箱", placeholder: "hello@example.com" },
  { id: "other", label: "其他", placeholder: "https://..." },
];

export function parseJsonList<T>(raw: string | null | undefined): T[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function platformLabel(id: string) {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label || id;
}

/** 将常见作品链接转为可嵌入预览的 URL；无法识别则返回 null */
export function toEmbedUrl(rawUrl: string): { embedUrl: string; platform: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v) return { embedUrl: `https://www.youtube.com/embed/${v}`, platform: "youtube" };
    const m = path.match(/\/embed\/([\w-]+)/) || path.match(/\/shorts\/([\w-]+)/);
    if (m) return { embedUrl: `https://www.youtube.com/embed/${m[1]}`, platform: "youtube" };
  }
  if (host === "youtu.be") {
    const id = path.replace(/^\//, "").split("/")[0];
    if (id) return { embedUrl: `https://www.youtube.com/embed/${id}`, platform: "youtube" };
  }

  // Bilibili 视频（主页 space 不走这里）
  if (host.endsWith("bilibili.com") || host === "b23.tv") {
    const bv =
      path.match(/\/video\/(BV[\w]+)/i) ||
      path.match(/\/(BV[\w]+)/i) ||
      rawUrl.match(/(BV[\w]+)/i);
    if (bv) {
      return {
        embedUrl: `https://player.bilibili.com/player.html?bvid=${bv[1]}&high_quality=1&autoplay=0&danmaku=0`,
        platform: "bilibili",
      };
    }
    const av = path.match(/\/video\/av(\d+)/i) || path.match(/[?&]aid=(\d+)/i);
    if (av) {
      return {
        embedUrl: `https://player.bilibili.com/player.html?aid=${av[1]}&high_quality=1&autoplay=0&danmaku=0`,
        platform: "bilibili",
      };
    }
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = path.match(/\/(?:video\/)?(\d+)/);
    if (m) return { embedUrl: `https://player.vimeo.com/video/${m[1]}`, platform: "vimeo" };
  }

  // Loom
  if (host === "loom.com" || host === "www.loom.com") {
    const m = path.match(/\/(?:share|embed)\/([\w-]+)/);
    if (m) return { embedUrl: `https://www.loom.com/embed/${m[1]}`, platform: "loom" };
  }

  // CodePen
  if (host === "codepen.io") {
    const m = path.match(/^\/([^/]+)\/(?:pen|embed)\/([^/]+)/);
    if (m) {
      return {
        embedUrl: `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`,
        platform: "codepen",
      };
    }
  }

  // CodeSandbox
  if (host === "codesandbox.io" || host.endsWith(".codesandbox.io")) {
    const m = path.match(/\/(?:s|embed|p)\/([^/?#]+)/) || path.match(/^\/([^/?#]+)/);
    if (m && m[1] && m[1] !== "s" && m[1] !== "embed") {
      return {
        embedUrl: `https://codesandbox.io/embed/${m[1]}?fontsize=14&hidenavigation=1&theme=dark`,
        platform: "codesandbox",
      };
    }
  }

  // Figma file/proto
  if (host === "figma.com" || host === "www.figma.com") {
    if (path.includes("/file/") || path.includes("/proto/") || path.includes("/design/")) {
      return {
        embedUrl: `https://www.figma.com/embed?embed_host=opentacker&url=${encodeURIComponent(url.toString())}`,
        platform: "figma",
      };
    }
  }

  return null;
}

export function normalizeHttpUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.includes("@") && !raw.includes("://") && !raw.startsWith("http")) {
    return raw;
  }
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function extractGithubUsername(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "github.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const reserved = new Set([
      "settings",
      "notifications",
      "pulls",
      "issues",
      "marketplace",
      "explore",
      "topics",
      "organizations",
      "login",
      "signup",
      "about",
      "pricing",
      "features",
      "enterprise",
      "security",
      "team",
      "orgs",
      "users",
      "search",
      "new",
    ]);
    const login = parts[0];
    if (!login || reserved.has(login.toLowerCase())) return null;
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(login)) return null;
    return login;
  } catch {
    return null;
  }
}

export function extractBilibiliMid(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (/^\d{1,16}$/.test(trimmed)) return trimmed;

  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "space.bilibili.com" || host === "m.bilibili.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const mid =
        host === "space.bilibili.com"
          ? parts[0]
          : parts[0]?.toLowerCase() === "space"
            ? parts[1]
            : null;
      if (mid && /^\d{1,16}$/.test(mid)) return mid;
    }

    if (host.endsWith("bilibili.com")) {
      const space = url.pathname.match(/\/space\/(\d{1,16})/i);
      if (space) return space[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function formatBilibiliCount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(n >= 100_000 ? 0 : 1)}万`;
  return String(n);
}
